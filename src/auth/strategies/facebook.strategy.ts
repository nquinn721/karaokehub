import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // For OAuth callback, we need the backend URL, not frontend URL
    const isProduction = configService.get<string>('NODE_ENV') === 'production';

    // Use the backend URL for OAuth callback
    let backendUrl;
    if (isProduction) {
      // Try multiple environment variables, then use hardcoded fallback
      backendUrl =
        configService.get<string>('BACKEND_URL') ||
        configService.get<string>('SERVICE_URL') ||
        'https://karaoke-hub.com'; // Updated to match your custom domain
    } else {
      backendUrl = 'http://localhost:8000';
    }

    const clientID = configService.get<string>('FACEBOOK_APP_ID') || '646464114624794';
    const clientSecret =
      configService.get<string>('FACEBOOK_APP_SECRET') || '3ce6645105081d6f3a5442a30bd6b1ae';

    // Only log configuration issues
    if (!clientID || !clientSecret) {
      console.error('Facebook OAuth Strategy Error: Missing credentials', {
        clientID: clientID ? 'SET' : 'NOT_SET',
        clientSecret: clientSecret ? 'SET' : 'NOT_SET',
      });
    }

    super({
      clientID,
      clientSecret,
      callbackURL: `${backendUrl}/api/auth/facebook/callback`,
      scope: ['public_profile'], // Only request public_profile, email requires app review
      profileFields: ['id', 'displayName', 'photos'], // Remove email from profileFields
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      const user = await this.authService.validateOAuthUser(profile, 'facebook');
      done(null, user);
    } catch (error) {
      console.error('🔴 Facebook OAuth validation error:', {
        error: error.message,
        profileId: profile?.id,
        profileEmail: profile?.emails?.[0]?.value,
      });
      done(error, false);
    }
  }
}
