import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Show } from '../show/show.entity';
import { SubscriptionModule } from '../subscription/subscription.module';
import { DjRegistrationController } from './dj-registration.controller';
import { DjRegistrationService } from './dj-registration.service';
import { DjShowManagementController } from './dj-show-management.controller';
import { DjShowManagementService } from './dj-show-management.service';
import { DjWebhookController } from './dj-webhook.controller';
import { DJController } from './dj.controller';
import { DJ } from './dj.entity';
import { DJService } from './dj.service';

@Module({
  imports: [TypeOrmModule.forFeature([DJ, User, Show]), SubscriptionModule],
  controllers: [
    DJController,
    DjRegistrationController,
    DjShowManagementController,
    DjWebhookController,
  ],
  providers: [DJService, DjRegistrationService, DjShowManagementService],
  exports: [DJService, DjRegistrationService, DjShowManagementService],
})
export class DJModule {}
