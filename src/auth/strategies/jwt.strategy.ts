import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: configService.get('NODE_ENV') === 'development', // Don't expire tokens in development
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    try {
      console.log('JWT Strategy validation started:', {
        payload,
        environment: this.configService.get('NODE_ENV'),
        jwtSecret: this.configService.get<string>('JWT_SECRET') ? 'SET' : 'NOT_SET',
      });

      const user = await this.authService.validateUser(payload);

      console.log('JWT Strategy validation successful:', {
        userId: user?.id,
        userEmail: user?.email,
      });

      return user;
    } catch (error) {
      console.error('JWT Strategy validation failed:', {
        error: error.message,
        payload,
        environment: this.configService.get('NODE_ENV'),
      });

      // In development, we can be more lenient with invalid tokens
      if (this.configService.get('NODE_ENV') === 'development') {
        console.warn('JWT validation failed in development mode, allowing request to continue');
        return null; // This will make the request unauthorized but not crash
      }
      throw error;
    }
  }
}
