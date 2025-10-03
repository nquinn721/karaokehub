import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('client')
  getClientConfig() {
    return {
      // Use client-specific API key for web browsers
      googleMapsApiKey:
        this.configService.get<string>('VITE_GOOGLE_MAPS_CLIENT_KEY') ||
        this.configService.get<string>('GOOGLE_MAPS_API_KEY'), // fallback
      googleClientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      stripePublishableKey: this.configService.get<string>('STRIPE_PUBLISHABLE_KEY'),
      // Add other client-side config here as needed
      environment: this.configService.get<string>('NODE_ENV'),
    };
  }
}
