import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { Package } from './entities/package.entity';
import { Feature } from './entities/feature.entity';
import { PackageFeature } from './entities/package-feature.entity';
import { Subscription } from './entities/subscription.entity';
import { Payment } from './entities/payment.entity';

// 🔥 NEW
import { EmailService } from '../services/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package, Feature, PackageFeature, Subscription, Payment]),
    forwardRef(() => UserModule),
  ],
  providers: [SubscriptionService, EmailService], 
  controllers: [SubscriptionController],
  exports: [TypeOrmModule, SubscriptionService],
})
export class SubscriptionModule {}