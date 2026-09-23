import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappSenderService {
  private readonly logger = new Logger(WhatsappSenderService.name);
  private readonly RAPIDAPI_HOST = 'whatsapp-messaging-bot.p.rapidapi.com';
  private readonly BASE_URL = 'https://whatsapp-messaging-bot.p.rapidapi.com';

  constructor(private readonly config: ConfigService) {}

  async sendTextMessage(chatId: string, text: string): Promise<boolean> {
    const apiKey = this.config.get<string>('RAPIDAPI_KEY');
    const session = this.config.get<string>('WHATSAPP_SESSION_NAME');

    if (!apiKey || !session) {
      this.logger.error('RAPIDAPI_KEY or WHATSAPP_SESSION_NAME not set in .env');
      return false;
    }

    try {
      const response = await fetch(`${this.BASE_URL}/v1/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': this.RAPIDAPI_HOST,
        },
        body: JSON.stringify({
          chatId,
          text,
          session,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`WhatsApp send failed: ${response.status} — ${errorText}`);
        return false;
      }

      const data = await response.json();
      this.logger.log(`WhatsApp message sent to ${chatId}`);
      return data?.success === true || true;
    } catch (error) {
      this.logger.error(
        `WhatsApp send error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return false;
    }
  }

  async sendPointsBundle(points: string[]): Promise<boolean> {
    const groupId = this.config.get<string>('WHATSAPP_GROUP_ID');
    if (!groupId) {
      this.logger.error('WHATSAPP_GROUP_ID not set in .env');
      return false;
    }

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Karachi',
    });

    const titles = [
      '*Industry News — Daily Brief*',
      '*Daily Market Update*',
      "*Today's Top Industry News*",
      '*Industry Pulse — Daily Digest*',
      '*Daily Market Brief*',
      "*Today's Industry Roundup*",
      '*Market Watch — Daily*',
      '*Daily Industry Highlights*',
    ];
    const title = titles[Math.floor(Math.random() * titles.length)];

    const formattedMessage = [
      title,
      today,
      '',
      ...points.map((point) => `• ${point}`),
      '',
      '_Powered by Seamfox_',
    ].join('\n');

    this.logger.log(`Sending ${points.length} points to group ${groupId}`);
    return await this.sendTextMessage(groupId, formattedMessage);
  }

  async verifyConnection(): Promise<boolean> {
    const apiKey = this.config.get<string>('RAPIDAPI_KEY');
    const session = this.config.get<string>('WHATSAPP_SESSION_NAME');

    if (!apiKey || !session) return false;

    try {
      const response = await fetch(`${this.BASE_URL}/v1/sessions/${session}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': this.RAPIDAPI_HOST,
        },
      });

      if (!response.ok) return false;
      const data = await response.json();
      const status = data?.data?.status;
      this.logger.log(`WhatsApp session status: ${status}`);
      return status === 'WORKING';
    } catch (error) {
      this.logger.error(`Verify connection error: ${(error as Error).message}`);
      return false;
    }
  }
}