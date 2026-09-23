import { IsNotEmpty, IsInt, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  subscriptionId: number;

  @IsNotEmpty()
  amount: number;

  @IsString()
  paymentMethod: string;

  @IsString()
  referenceNo: string;

  @IsOptional()
  @IsUUID()
  createdBy: string;
}
