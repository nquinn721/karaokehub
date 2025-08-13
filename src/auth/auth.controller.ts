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

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req) {
    return {
      success: true,
      user: req.user,
    };
  }

  // Temporary route to promote yourself to admin (remove in production)
  @Post('make-me-admin')
  @UseGuards(AuthGuard('jwt'))
  async makeMeAdmin(@Req() req) {
    const user = await this.userService.updateAdminStatus(req.user.id, true);
    return {
      success: true,
      message: 'You are now an admin!',
      user,
    };
  }
}
