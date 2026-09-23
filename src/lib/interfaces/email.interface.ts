export interface IEmailAttachment {
  filename: string;
  contentType?: string;
  content?: Buffer | string;
  path?: string;
}

export interface IEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: IEmailAttachment[];
}