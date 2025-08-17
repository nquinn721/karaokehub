import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { UrlService } from '../config/url.service';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private urlService: UrlService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      const result = await this.authService.register(createUserDto);
      return {
        success: true,
        user: result.user,
        token: result.token,
        message: result.message || 'Registration successful',
      };
    } catch (error) {
      throw new HttpException(error.message || 'Registration failed', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      return {
        success: true,
        user: result.user,
        token: result.token,
      };
    } catch (error) {
      throw new HttpException(error.message || 'Login failed', HttpStatus.UNAUTHORIZED);
    }
  }
  ogin;
  @Post('google/verify')
  async verifyGoogleCredential(@Body() body: { credential: string; clientId?: string }) {
    try {
      console.log('🟢 [GOOGLE_ONE_TAP] Starting credential verification');

      if (!body.credential) {
        throw new HttpException('Credential is required', HttpStatus.BAD_REQUEST);
      }

      // Verify the Google JWT credential
      const result = await this.authService.verifyGoogleCredential(body.credential);

      console.log('🟢 [GOOGLE_ONE_TAP] Verification successful for user:', result.user.email);

      return {
        success: true,
        user: result.user,
        token: result.token,
        isNewUser: result.isNewUser,
        message: result.isNewUser ? 'Account created successfully' : 'Login successful',
      };
    } catch (error) {
      console.error('🔴 [GOOGLE_ONE_TAP] Verification failed:', error.message);
      throw new HttpException(
        error.message || 'Google credential verification failed',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    console.log('🟢 [GOOGLE_OAUTH_CALLBACK] Starting OAuth callback processing');
    console.log('🔍 [GOOGLE_OAUTH_CALLBACK] Request details:', {
      url: req.url,
      query: req.query,
      headers: {
        host: req.get('host'),
        'x-forwarded-proto': req.get('x-forwarded-proto'),
        'user-agent': req.get('user-agent'),
        referer: req.get('referer'),
      },
      userExists: !!req.user,
      userDetails: req.user
        ? {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            provider: req.user.provider,
            providerId: req.user.providerId,
          }
        : null,
    });

    try {
      if (!req.user) {
        console.error(
          '🔴 [GOOGLE_OAUTH_CALLBACK] No user object in request after OAuth validation',
        );
        throw new Error('No user object in request after OAuth validation');
      }

      const user = req.user;
      console.log('🟢 [GOOGLE_OAUTH_CALLBACK] User object found:', {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      });

      const token = this.authService.generateToken(user);
      console.log('🟢 [GOOGLE_OAUTH_CALLBACK] Token generated successfully');

      // Use UrlService for consistent URL management
      const redirectUrl = this.urlService.buildFrontendUrl(`/auth/success?token=${token}`);
      console.log('🟢 [GOOGLE_OAUTH_CALLBACK] Redirecting to success:', redirectUrl);

      // Redirect to frontend with token
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('🔴 [GOOGLE_OAUTH_CALLBACK] Error occurred:', {
        error: error.message,
        stack: error.stack,
        userEmail: req.user?.email,
        query: req.query,
        url: req.url,
      });

      // Use UrlService for error redirect
      const errorUrl = this.urlService.getAuthRedirectUrls().error;
      console.log('🔴 [OAUTH_CALLBACK] Redirecting to error page:', errorUrl);
      res.redirect(errorUrl);
    }
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth(@Req() req) {
    // Initiates GitHub OAuth flow
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(@Req() req, @Res() res: Response) {
    try {
      const user = req.user;
      const token = this.authService.generateToken(user);

      // Use UrlService for consistent URL management
      const successUrl = this.urlService.buildFrontendUrl(`/auth/success?token=${token}`);
      res.redirect(successUrl);
    } catch (error) {
      const errorUrl = this.urlService.getAuthRedirectUrls().error;
      res.redirect(errorUrl);
    }
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth(@Req() req) {
    // Initiates Facebook OAuth flow
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthCallback(@Req() req, @Res() res: Response) {
    try {
      if (!req.user) {
        throw new Error('No user object in request after Facebook OAuth validation');
      }

      const user = req.user;
      const token = this.authService.generateToken(user);

      // Use UrlService for consistent URL management
      const redirectUrl = this.urlService.buildFrontendUrl(`/auth/success?token=${token}`);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('🔴 Facebook OAuth callback error:', {
        error: error.message,
        userEmail: req.user?.email,
      });

      // Use UrlService for error redirect
      const errorUrl = this.urlService.getAuthRedirectUrls().error;
      console.log('🔴 [FACEBOOK_OAUTH_CALLBACK] Redirecting to error page:', errorUrl);
      res.redirect(errorUrl);
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req) {
    if (!req.user) {
      console.error('🔴 Profile endpoint: No user object after JWT validation');
      throw new Error('User not authenticated');
    }

    return {
      success: true,
      user: req.user,
    };
  }

  // Logout endpoint (client should clear token)
  @Post('logout')
  async logout() {
    return {
      success: true,
      message: 'Logged out successfully. Please clear your token.',
    };
  }

  // Development only - create a test user
  @Post('create-test-user')
  async createTestUser() {
    if (process.env.NODE_ENV !== 'development') {
      throw new HttpException(
        'This endpoint is only available in development',
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      const testUser = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const result = await this.authService.register(testUser);
      return {
        success: true,
        message: 'Test user created successfully',
        user: result.user,
        token: result.token,
      };
    } catch (error) {
      // If user already exists, try to login instead
      if (error.message.includes('already exists')) {
        const loginResult = await this.authService.login({
          email: 'test@example.com',
          password: 'password123',
        });
        return {
          success: true,
          message: 'Test user already exists, logged in successfully',
          user: loginResult.user,
          token: loginResult.token,
        };
      }
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Development only - create a test OAuth user
  @Post('create-test-oauth-user')
  async createTestOAuthUser() {
    if (process.env.NODE_ENV !== 'development') {
      throw new HttpException(
        'This endpoint is only available in development',
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      // Create an OAuth user (without password)
      const oauthUser = await this.userService.create({
        email: 'oauth@example.com',
        name: 'OAuth Test User',
        provider: 'google',
        providerId: 'google-123456',
        avatar: 'https://example.com/avatar.jpg',
      });

      const token = this.authService.generateToken(oauthUser);

      return {
        success: true,
        message: 'Test OAuth user created successfully',
        user: oauthUser,
        token,
      };
    } catch (error) {
      if (error.message.includes('already exists') || error.code === 'ER_DUP_ENTRY') {
        // User already exists, just return them
        const existingUser = await this.userService.findByEmail('oauth@example.com');
        const token = this.authService.generateToken(existingUser);
        return {
          success: true,
          message: 'OAuth user already exists, logged in successfully',
          user: existingUser,
          token,
        };
      }
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
