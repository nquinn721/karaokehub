import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // Use the backend URL for OAuth callback
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    const backendUrl = isProduction
      ? configService.get<string>('BACKEND_URL') ||
        'https://karaokehub-203453576607.us-central1.run.app'
      : 'http://localhost:8000';

    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: `${backendUrl}/api/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any): Promise<any> {
    try {
      const user = await this.authService.validateOAuthUser(profile, 'github');
      return user;
    } catch (error) {
      throw error;
    }
  }
}
