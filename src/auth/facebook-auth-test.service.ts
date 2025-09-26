import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookAuthTestService {
  private readonly logger = new Logger(FacebookAuthTestService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Test Facebook authentication configuration
   */
  testConfiguration(): {
    status: 'success' | 'error';
    message: string;
    details?: any;
  } {
    try {
      const facebookAppId = this.configService.get<string>('FACEBOOK_APP_ID');
      const facebookAppSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');

      if (!facebookAppId) {
        return {
          status: 'error',
          message: 'FACEBOOK_APP_ID environment variable is not set',
        };
      }

      if (!facebookAppSecret) {
        return {
          status: 'error',
          message: 'FACEBOOK_APP_SECRET environment variable is not set',
        };
      }

      // Test if the app ID looks valid (should be numeric)
      if (!/^\d+$/.test(facebookAppId)) {
        return {
          status: 'error',
          message: 'FACEBOOK_APP_ID should be a numeric string',
          details: { appId: facebookAppId.substring(0, 4) + '...' },
        };
      }

      return {
        status: 'success',
        message: 'Facebook authentication configuration is valid',
        details: {
          appId: facebookAppId.substring(0, 4) + '...',
          secretLength: facebookAppSecret.length,
        },
      };
    } catch (error) {
      this.logger.error('Error testing Facebook configuration:', error);
      return {
        status: 'error',
        message: 'Unexpected error testing Facebook configuration',
        details: { error: error.message },
      };
    }
  }

  /**
   * Get Facebook OAuth URLs for debugging
   */
  getOAuthUrls(): {
    loginUrl: string;
    callbackUrl: string;
  } {
    const baseUrl =
      this.configService.get<string>('NODE_ENV') === 'production'
        ? 'https://karaoke-hub-backend-993538830120.us-central1.run.app'
        : `http://localhost:${this.configService.get<string>('PORT') || 3001}`;

    return {
      loginUrl: `${baseUrl}/api/auth/facebook`,
      callbackUrl: `${baseUrl}/api/auth/facebook/callback`,
    };
  }
}
