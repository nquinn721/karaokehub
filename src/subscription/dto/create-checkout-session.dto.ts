import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { SubscriptionPlan } from '../subscription.entity';

export class CreateCheckoutSessionDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsOptional()
  @IsBoolean()
  mobileOptimized?: boolean;
}
