import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFeatureOverride } from './user-feature-override.entity';
import { UserFeatureOverrideController } from './user-feature-override.controller';
import { UserFeatureOverrideService } from './user-feature-override.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserFeatureOverride])],
  controllers: [UserFeatureOverrideController],
  providers: [UserFeatureOverrideService],
  exports: [UserFeatureOverrideService],
})
export class UserFeatureOverrideModule {}
