import { Controller, Post, Req, Res } from '@nestjs/common';
import * as express from 'express';
import { Request, Response } from 'express';
import { SubscriptionService } from '../subscription/subscription.service';

@Controller('stripe')
export class StripeController {
  constructor(private readonly service: SubscriptionService) {}

  @Post('webhook')
  async handleWebhook(@Req() req: any, @Res() res: Response) {
    const sig = req.headers['stripe-signature'];

    try {
      const event = await this.service.constructWebhookEvent(req.body, sig);
      await this.service.handleWebhook(event);

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('Webhook Error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
