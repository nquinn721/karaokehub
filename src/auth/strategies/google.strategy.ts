import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { UrlService } from '../../config/url.service';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private urlService: UrlService,
  ) {
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
      callbackURL: urlService.getOAuthUrls().googleCallback,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    console.log('🟢 [GOOGLE_STRATEGY] Starting OAuth validation');
    console.log('🔍 [GOOGLE_STRATEGY] Profile data received:', {
      id: profile?.id,
      displayName: profile?.displayName,
      email: profile?.emails?.[0]?.value,
      firstName: profile?.name?.givenName,
      lastName: profile?.name?.familyName,
      photo: profile?.photos?.[0]?.value,
      provider: profile?.provider,
      profileRaw: JSON.stringify(profile, null, 2),
    });

    try {
      console.log('🟢 [GOOGLE_STRATEGY] Calling authService.validateOAuthUser');
      const user = await this.authService.validateOAuthUser(profile, 'google');
      console.log('🟢 [GOOGLE_STRATEGY] User validation successful:', {
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name,
        userProvider: user?.provider,
      });
      done(null, user);
    } catch (error) {
      console.error('🔴 [GOOGLE_STRATEGY] OAuth validation error:', {
        error: error.message,
        stack: error.stack,
        profileId: profile?.id,
        profileEmail: profile?.emails?.[0]?.value,
      });
      done(error, false);
    }
  }
}
