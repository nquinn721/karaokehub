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
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    try {
      if (!req.user) {
        throw new Error('No user object in request after OAuth validation');
      }

      const user = req.user;
      const token = this.authService.generateToken(user);

      // Determine frontend URL based on environment - with dynamic detection like canvas-game
      const isProduction = process.env.NODE_ENV === 'production';
      let frontendUrl = process.env.FRONTEND_URL;

      if (!frontendUrl) {
        if (isProduction) {
          // Dynamic URL detection from request headers
          const protocol = req.get('x-forwarded-proto') || 'https';
          const host = req.get('host');
          frontendUrl = `${protocol}://${host}`;
        } else {
          frontendUrl = 'http://localhost:5173';
        }
      }

      const redirectUrl = `${frontendUrl}/auth/success?token=${token}`;

      // Redirect to frontend with token
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('🔴 Google OAuth callback error:', {
        error: error.message,
        userEmail: req.user?.email,
      });

      // Determine frontend URL for error redirect - with dynamic detection
      const isProduction = process.env.NODE_ENV === 'production';
      let frontendUrl = process.env.FRONTEND_URL;

      if (!frontendUrl) {
        if (isProduction) {
          // Dynamic URL detection from request headers
          const protocol = req.get('x-forwarded-proto') || 'https';
          const host = req.get('host');
          frontendUrl = `${protocol}://${host}`;
        } else {
          frontendUrl = 'http://localhost:5173';
        }
      }

      const errorUrl = `${frontendUrl}/auth/error`;
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

      // Try different frontend URLs
      const possibleUrls = [
        process.env.FRONTEND_URL,
        'http://localhost:5176',
        'http://localhost:5175',
        'http://localhost:5174',
        'http://localhost:5173',
      ];

      const frontendUrl = possibleUrls.find((url) => url) || 'http://localhost:5173';

      // Redirect to frontend with token
      res.redirect(`${frontendUrl}/auth/success?token=${token}`);
    } catch (error) {
      const possibleUrls = [
        process.env.FRONTEND_URL,
        'http://localhost:5176',
        'http://localhost:5175',
        'http://localhost:5174',
        'http://localhost:5173',
      ];

      const frontendUrl = possibleUrls.find((url) => url) || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/error`);
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

      // Determine frontend URL based on environment
      const isProduction = process.env.NODE_ENV === 'production';
      let frontendUrl = process.env.FRONTEND_URL;

      if (!frontendUrl) {
        if (isProduction) {
          // Dynamic URL detection from request headers
          const protocol = req.get('x-forwarded-proto') || 'https';
          const host = req.get('host');
          frontendUrl = `${protocol}://${host}`;
        } else {
          frontendUrl = 'http://localhost:5173';
        }
      }

      const redirectUrl = `${frontendUrl}/auth/success?token=${token}`;

      // Redirect to frontend with token
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('🔴 Facebook OAuth callback error:', {
        error: error.message,
        userEmail: req.user?.email,
      });

      // Determine frontend URL for error redirect
      const isProduction = process.env.NODE_ENV === 'production';
      let frontendUrl = process.env.FRONTEND_URL;

      if (!frontendUrl) {
        if (isProduction) {
          // Dynamic URL detection from request headers
          const protocol = req.get('x-forwarded-proto') || 'https';
          const host = req.get('host');
          frontendUrl = `${protocol}://${host}`;
        } else {
          frontendUrl = 'http://localhost:5173';
        }
      }

      const errorUrl = `${frontendUrl}/auth/error`;
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
