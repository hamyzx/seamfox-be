import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private client: Twilio;

  constructor() {
    this.client = new Twilio(
      process.env.TWILIO_API_KEY_SID, // SK...
      process.env.TWILIO_API_KEY_SECRET, // Secret
      {
        accountSid: process.env.TWILIO_ACCOUNT_SID, // AC...
      },
    );
  }

  async sendSms(to: string, message: string) {
    try {
      return await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
    } catch (error) {
      console.error('Twilio Error:', error);
      throw new InternalServerErrorException('Failed to send SMS');
    }
  }
}
