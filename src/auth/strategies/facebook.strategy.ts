import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { UrlService } from '../../config/url.service';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private urlService: UrlService,
  ) {
    const clientID = configService.get<string>('FACEBOOK_APP_ID');
    const clientSecret = configService.get<string>('FACEBOOK_APP_SECRET');

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
      callbackURL: urlService.getOAuthUrls().facebookCallback,
      scope: ['public_profile', 'email'], // Request both public_profile and email
      profileFields: ['id', 'displayName', 'photos', 'email'], // Include email in profileFields
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
      console.error('Facebook OAuth validation error:', error.message);
      done(error, false);
    }
  }
}
