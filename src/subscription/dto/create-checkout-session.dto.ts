import { IsEnum } from 'class-validator';
import { SubscriptionPlan } from '../subscription.entity';

export class CreateCheckoutSessionDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}
