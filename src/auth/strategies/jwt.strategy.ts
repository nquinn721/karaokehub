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
      return await this.authService.validateUser(payload);
    } catch (error) {
      // In development, we can be more lenient with invalid tokens
      if (this.configService.get('NODE_ENV') === 'development') {
        console.warn('JWT validation failed in development mode, allowing request to continue');
        return null; // This will make the request unauthorized but not crash
      }
      throw error;
    }
  }
}
