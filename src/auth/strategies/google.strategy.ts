import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // For OAuth callback, we need the backend URL, not frontend URL
    const isProduction = configService.get<string>('NODE_ENV') === 'production';

    // Use the backend URL for OAuth callback - with hardcoded fallback like canvas-game
    let backendUrl;
    if (isProduction) {
      // Try multiple environment variables, then use hardcoded fallback
      backendUrl =
        configService.get<string>('BACKEND_URL') ||
        configService.get<string>('SERVICE_URL') ||
        'https://karaokehub-pvq7mkyeaq-uc.a.run.app';
    } else {
      backendUrl = 'http://localhost:8000';
    }

    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    // Only log configuration issues
    if (!clientID || !clientSecret) {
      console.error('Google OAuth Strategy Error: Missing credentials', {
        clientID: clientID ? 'SET' : 'NOT_SET',
        clientSecret: clientSecret ? 'SET' : 'NOT_SET',
      });
    }

    super({
      clientID,
      clientSecret,
      callbackURL: `${backendUrl}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const user = await this.authService.validateOAuthUser(profile, 'google');
      done(null, user);
    } catch (error) {
      console.error('🔴 Google OAuth validation error:', {
        error: error.message,
        profileId: profile?.id,
        profileEmail: profile?.emails?.[0]?.value,
      });
      done(error, false);
    }
  }
}
