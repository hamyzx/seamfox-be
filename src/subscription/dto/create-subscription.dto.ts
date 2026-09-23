import { IsEnum, IsInt, IsOptional, IsUUID, IsString } from 'class-validator';
import { BillingCycle, SubscriptionStatus } from '../../lib/enums/subscription-plan.enum';

export class CreateSubscriptionDto {
  @IsOptional()
  @IsUUID()
  userId: string;

  @IsInt()
  packageId: number;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @IsOptional()
  @IsUUID()
  createdBy: string;

  @IsString()
  successUrl: string;

  @IsString()
  cancelUrl: string;
}
