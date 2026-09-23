import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { StripeController } from './stripe.controller';

@Module({
  imports: [SubscriptionModule],
  controllers: [StripeController],
})
export class StripeModule {}
