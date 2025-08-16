import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { UrlService } from './url.service';

@Module({
  controllers: [ConfigController],
  providers: [UrlService],
  exports: [UrlService],
})
export class ConfigApiModule {}
