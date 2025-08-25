import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('client')
  getClientConfig() {
    return {
      googleMapsApiKey: this.configService.get<string>('GOOGLE_MAPS_API_KEY'),
      googleClientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      // Add other client-side config here as needed
      environment: this.configService.get<string>('NODE_ENV'),
    };
  }
}
