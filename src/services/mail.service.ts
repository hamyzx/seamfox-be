import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { IEmailOptions } from '../lib/interfaces/email.interface';

// const S3_BASE_URL_FALLBACK = 'https://seamfox-stage.s3.us-east-1.amazonaws.com';
const S3_BASE_URL_FALLBACK = 'https://seamfoxprod.s3.ap-southeast-1.amazonaws.com';


@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private readonly FETCH_TIMEOUT_MS = 30000;
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY_MS = 2000;

  constructor(private readonly configService: ConfigService) {}

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = this.FETCH_TIMEOUT_MS,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    label: string = 'fetch',
  ): Promise<Response> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES + 1; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        return response;
      } catch (err: any) {
        lastError = err;
        const isTimeout =
          err?.name === 'AbortError' ||
          err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
          err?.message?.toLowerCase().includes('timeout');

        const isNetworkError =
          isTimeout ||
          err?.cause?.code === 'ECONNREFUSED' ||
          err?.cause?.code === 'ENOTFOUND';

        if (attempt > this.MAX_RETRIES || !isNetworkError) {
          throw err;
        }

        this.logger.warn(
          `[${label}] Attempt ${attempt} failed (${err?.cause?.code || err?.message}). Retrying in ${this.RETRY_DELAY_MS}ms...`,
        );
        await this.sleep(this.RETRY_DELAY_MS * attempt);
      }
    }

    throw lastError;
  }

  private resolveS3Url(filePath: string): string {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      this.logger.log(`[S3] Path already full URL: ${filePath}`);
      return filePath;
    }

    const s3Base = (
      this.configService.get('S3_BASE_URL') ||
      this.configService.get('AWS_S3_BASE_URL') ||
      process.env.S3_BASE_URL ||
      process.env.AWS_S3_BASE_URL ||
      S3_BASE_URL_FALLBACK
    ).replace(/\/$/, '');

    this.logger.log(
      `[S3] Base used: ${s3Base} (env S3_BASE_URL: ${this.configService.get('S3_BASE_URL') || 'NOT SET'}, AWS_S3_BASE_URL: ${this.configService.get('AWS_S3_BASE_URL') || 'NOT SET'})`,
    );

    const cleanPath = filePath.replace(/^\//, '');
    const finalUrl = `${s3Base}/${cleanPath}`;
    this.logger.log(`[S3] Final URL: ${finalUrl}`);
    return finalUrl;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      this.logger.log('Using cached access token');
      return this.accessToken;
    }

    const tenantId = this.configService.get('MICROSOFT_TENANT_ID');
    const clientId = this.configService.get('MICROSOFT_CLIENT_ID');
    const clientSecret = this.configService.get('MICROSOFT_CLIENT_SECRET');

    this.logger.log(`Fetching new token for tenant: ${tenantId}`);

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    try {
      const response = await this.fetchWithRetry(
        tokenUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        },
        'OAuth2 token fetch',
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Token fetch failed: ${error}`);
        throw new Error(`Failed to get access token: ${error}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

      this.logger.log('Access token fetched successfully');

      return data.access_token;
    } catch (error) {
      this.logger.error('OAuth2 token fetch failed', error);
      throw error;
    }
  }
private async sendViaGraphAPI(emailOptions: IEmailOptions): Promise<any> {
  const accessToken = await this.getAccessToken();
  const fromEmail = this.configService.get('SMTP_USER');

  if (!emailOptions.to || (Array.isArray(emailOptions.to) && emailOptions.to.length === 0)) {
    throw new Error('Email recipient is missing');
  }

  this.logger.log(
    `[EMAIL] Sending email | From: ${fromEmail} | To: ${JSON.stringify(emailOptions.to)} | Subject: ${emailOptions.subject}`,
  );

  const toRecipients = Array.isArray(emailOptions.to)
    ? emailOptions.to.map((email) => ({
        emailAddress: { address: email },
      }))
    : [
        {
          emailAddress: { address: emailOptions.to },
        },
      ];

  const message: any = {
    message: {
      subject: emailOptions.subject,
      body: {
        contentType: emailOptions.html ? 'HTML' : 'Text',
        content: emailOptions.html || emailOptions.text || '',
      },
      toRecipients,
    },
    saveToSentItems: true,
  };

  if (emailOptions.attachments && emailOptions.attachments.length > 0) {
    const validAttachments: any[] = [];

    this.logger.log(
      `[ATTACH] Processing ${emailOptions.attachments.length} attachment(s)`,
    );

    for (const att of emailOptions.attachments) {
      try {
        let contentBytes: string | null = null;
        let contentType = att.contentType || 'application/octet-stream';

        if (att.content) {
          if (Buffer.isBuffer(att.content)) {
            contentBytes = att.content.toString('base64');
          } else if (typeof att.content === 'string') {
            contentBytes = att.content;
          }
        } else if (att.path) {
          const resolvedUrl = this.resolveS3Url(att.path);

          const fileRes = await this.fetchWithRetry(
            resolvedUrl,
            {},
            `attachment-${att.filename}`,
          );

          if (!fileRes.ok) {
            this.logger.warn(
              `[ATTACH] Failed fetching ${att.filename}`,
            );
            continue;
          }

          const arrayBuffer = await fileRes.arrayBuffer();

          contentBytes = Buffer.from(arrayBuffer).toString('base64');

          const fetchedType = fileRes.headers.get('content-type');

          if (fetchedType && !att.contentType) {
            contentType = fetchedType;
          }
        }

        if (!contentBytes) {
          this.logger.warn(
            `[ATTACH] Skipping ${att.filename}, no content`,
          );
          continue;
        }

        validAttachments.push({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.filename,
          contentType,
          contentBytes,
        });

      } catch (err: any) {
        this.logger.warn(
          `[ATTACH] Error ${att.filename}: ${err.message}`,
        );
      }
    }

    if (validAttachments.length > 0) {
      message.message.attachments = validAttachments;
      this.logger.log(
        `[ATTACH] Added ${validAttachments.length} attachment(s)`,
      );
    }
  }


  const response = await this.fetchWithRetry(
    `https://graph.microsoft.com/v1.0/users/${fromEmail}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    },
    'Graph API sendMail',
  );


  if (!response.ok) {
    const error = await response.text();

    this.logger.error(
      `[EMAIL] Graph API failed: ${error}`,
    );

    throw new Error(
      `Graph API send failed: ${error}`,
    );
  }


  this.logger.log(
    `[EMAIL] Successfully sent | To: ${JSON.stringify(emailOptions.to)} | Subject: ${emailOptions.subject}`,
  );


  return {
    messageId: 'sent',
    response: 'Email sent via Graph API',
  };
}


async send(emailOptions: IEmailOptions): Promise<void | string> {
  try {

    this.logger.log(
      `[EMAIL] Triggered | To: ${JSON.stringify(emailOptions.to)} | Subject: ${emailOptions.subject}`,
    );

    const result = await this.sendViaGraphAPI(emailOptions);

    this.logger.log(
      '[EMAIL] Completed successfully',
    );

    return result;

  } catch (error: any) {

    this.logger.error(
      `[EMAIL] Failed: ${error.message}`,
    );

    throw error;
  }
}


  private async createTransporter(): Promise<Transporter> {
    this.logger.log('Creating SMTP transporter...');
    const accessToken = await this.getAccessToken();

    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = Number(this.configService.get('SMTP_PORT'));
    const smtpUser = this.configService.get('SMTP_USER');

    this.logger.log(
      `SMTP Config - Host: ${smtpHost}, Port: ${smtpPort}, User: ${smtpUser}`,
    );
    this.logger.log(`Access token length: ${accessToken?.length || 0}`);

    return createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        type: 'OAuth2',
        user: smtpUser,
        accessToken: accessToken,
      },
      debug: true,
      logger: true,
    });
  }

  // async send(emailOptions: IEmailOptions): Promise<void | string> {
  //   try {
  //     this.logger.log('Sending email via Microsoft Graph API...');
  //     this.logger.log(
  //       `From: ${this.configService.get('SMTP_USER')} to: ${emailOptions.to}`,
  //     );

  //     const result = await this.sendViaGraphAPI(emailOptions);
  //     this.logger.log('Email sent successfully via Graph API', result);

  //     return result;
  //   } catch (error) {
  //     this.logger.error('Email send failed', error);
  //     throw error;
  //   }
  // }
}