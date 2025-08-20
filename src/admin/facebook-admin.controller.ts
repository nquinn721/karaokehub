/**
 * Admin UI endpoint for secure Facebook credential handling
 * Accepts one-time credentials, establishes session, then discards credentials
 */

import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { FacebookParserService } from '../parser/facebook-parser.service';

export interface FacebookLoginRequest {
  email: string;
  password: string;
  rememberSession: boolean;
}

@Controller('admin/facebook')
// @UseGuards(AdminGuard) // Add proper admin guard when available
export class FacebookAdminController {
  constructor(private readonly facebookParser: FacebookParserService) {}

  /**
   * One-time Facebook login through admin UI
   * Credentials are used once and immediately discarded
   */
  @Post('login')
  async setupFacebookLogin(@Body() loginData: FacebookLoginRequest) {
    try {
      // Validate input
      if (!loginData.email || !loginData.password) {
        throw new HttpException('Email and password required', HttpStatus.BAD_REQUEST);
      }

      // Initialize browser
      await this.facebookParser.initializeBrowser();

      // Attempt login with provided credentials
      const loginSuccess = await this.facebookParser.loginWithCredentials(
        loginData.email,
        loginData.password,
      );

      if (!loginSuccess) {
        throw new HttpException('Facebook login failed', HttpStatus.UNAUTHORIZED);
      }

      // Save session if requested
      if (loginData.rememberSession) {
        await this.facebookParser.saveCurrentSession();
      }

      // Immediately clear credentials from memory
      loginData.email = '';
      loginData.password = '';

      return {
        success: true,
        message: 'Facebook session established successfully',
        sessionSaved: loginData.rememberSession,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Clear any sensitive data
      loginData.email = '';
      loginData.password = '';

      throw new HttpException(
        `Facebook login setup failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check current Facebook session status
   */
  @Post('status')
  async getFacebookStatus() {
    try {
      const isLoggedIn = this.facebookParser.getLoginStatus();
      const hasSession = this.facebookParser.hasSavedSession();

      return {
        loggedIn: isLoggedIn,
        savedSession: hasSession,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        loggedIn: false,
        savedSession: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Clear saved Facebook session
   */
  @Post('logout')
  async clearFacebookSession() {
    try {
      await this.facebookParser.clearSession();

      return {
        success: true,
        message: 'Facebook session cleared successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to clear session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
