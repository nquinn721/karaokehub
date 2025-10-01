import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigApiModule } from '../config/config.module';
import { User } from '../entities/user.entity';
import { UserFeatureOverrideModule } from '../user-feature-override/user-feature-override.module';
import { StripeService } from './stripe.service';
import { SubscriptionController } from './subscription.controller';
import { Subscription } from './subscription.entity';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, User]),
    ConfigModule,
    ConfigApiModule,
    UserFeatureOverrideModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, StripeService],
  exports: [SubscriptionService, StripeService],
})
export class SubscriptionModule {}
