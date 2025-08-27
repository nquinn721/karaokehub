import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface FacebookCookieValidationResult {
  isValid: boolean;
  expired: number;
  total: number;
  missingRequired: string[];
  lastChecked: Date;
}

@Injectable()
export class FacebookCookieValidatorService {
  private readonly logger = new Logger(FacebookCookieValidatorService.name);
  private readonly requiredCookies = ['xs', 'c_user', 'datr', 'sb'];

  constructor(private configService: ConfigService) {}

  /**
   * Validate Facebook cookies from environment or file
   */
  async validateFacebookCookies(): Promise<FacebookCookieValidationResult> {
    this.logger.log('🍪 Validating Facebook session cookies...');

    try {
      const cookies = await this.loadCookies();

      if (!cookies || cookies.length === 0) {
        return {
          isValid: false,
          expired: 0,
          total: 0,
          missingRequired: this.requiredCookies,
          lastChecked: new Date(),
        };
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const expiredCookies = cookies.filter(
        (cookie) => cookie.expires && cookie.expires !== -1 && cookie.expires < currentTime,
      );

      const cookieNames = cookies.map((cookie) => cookie.name);
      const missingRequired = this.requiredCookies.filter(
        (required) => !cookieNames.includes(required),
      );

      const isValid = expiredCookies.length === 0 && missingRequired.length === 0;

      this.logger.log(`📊 Cookie validation results:`);
      this.logger.log(`   Total cookies: ${cookies.length}`);
      this.logger.log(`   Expired cookies: ${expiredCookies.length}`);
      this.logger.log(`   Missing required: ${missingRequired.length}`);
      this.logger.log(`   Overall valid: ${isValid ? '✅' : '❌'}`);

      if (expiredCookies.length > 0) {
        this.logger.warn(`⚠️ Expired cookies: ${expiredCookies.map((c) => c.name).join(', ')}`);
      }

      if (missingRequired.length > 0) {
        this.logger.warn(`⚠️ Missing required cookies: ${missingRequired.join(', ')}`);
      }

      return {
        isValid,
        expired: expiredCookies.length,
        total: cookies.length,
        missingRequired,
        lastChecked: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Cookie validation failed: ${error.message}`);
      return {
        isValid: false,
        expired: 0,
        total: 0,
        missingRequired: this.requiredCookies,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Load cookies from environment variable or file
   */
  private async loadCookies(): Promise<any[]> {
    // Try environment variable first (production)
    const cookiesFromEnv = this.configService.get<string>('FB_SESSION_COOKIES');

    if (cookiesFromEnv) {
      this.logger.log('📦 Loading cookies from environment variable...');
      try {
        return JSON.parse(cookiesFromEnv);
      } catch (error) {
        this.logger.error(`❌ Failed to parse FB_SESSION_COOKIES: ${error.message}`);
        throw error;
      }
    }

    // Try local file (development)
    const cookiesFilePath = path.join(process.cwd(), 'data', 'facebook-cookies.json');

    if (fs.existsSync(cookiesFilePath)) {
      this.logger.log('📂 Loading cookies from local file...');
      try {
        const fileContent = fs.readFileSync(cookiesFilePath, 'utf8');
        return JSON.parse(fileContent);
      } catch (error) {
        this.logger.error(`❌ Failed to parse facebook-cookies.json: ${error.message}`);
        throw error;
      }
    }

    this.logger.warn('❌ No Facebook cookies found (neither environment nor file)');
    return [];
  }

  /**
   * Get detailed cookie analysis for admin dashboard
   */
  async getCookieAnalysis(): Promise<{
    validation: FacebookCookieValidationResult;
    recommendations: string[];
    nextExpiry: Date | null;
  }> {
    const validation = await this.validateFacebookCookies();
    const recommendations: string[] = [];

    if (!validation.isValid) {
      if (validation.total === 0) {
        recommendations.push(
          'No Facebook cookies found. Please log into Facebook and export cookies.',
        );
      }

      if (validation.expired > 0) {
        recommendations.push('Some cookies are expired. Please refresh your Facebook login.');
      }

      if (validation.missingRequired.length > 0) {
        recommendations.push(`Missing required cookies: ${validation.missingRequired.join(', ')}`);
      }
    } else {
      recommendations.push('Facebook cookies are valid and ready for parsing.');
    }

    // Calculate next expiry
    let nextExpiry: Date | null = null;
    try {
      const cookies = await this.loadCookies();
      const validExpiries = cookies
        .filter((cookie) => cookie.expires && cookie.expires !== -1)
        .map((cookie) => cookie.expires)
        .sort((a, b) => a - b);

      if (validExpiries.length > 0) {
        nextExpiry = new Date(validExpiries[0] * 1000);
      }
    } catch (error) {
      // Ignore errors here
    }

    return {
      validation,
      recommendations,
      nextExpiry,
    };
  }

  /**
   * Test Facebook authentication by attempting to access a Facebook page
   */
  async testFacebookAuthentication(): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
    responseInfo?: string;
  }> {
    this.logger.log('🧪 Testing Facebook authentication...');

    try {
      const cookies = await this.loadCookies();

      if (!cookies || cookies.length === 0) {
        return {
          success: false,
          error: 'No cookies available for testing',
        };
      }

      // Create cookie string for HTTP request
      const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');

      // Test with a simple HTTP request to Facebook
      const fetch = (await import('node-fetch')).default;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://www.facebook.com/me', {
        headers: {
          Cookie: cookieString,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      const isLoggedIn = !responseText.includes('login') && response.status === 200;

      this.logger.log(`📊 Authentication test result: ${response.status}`);
      this.logger.log(`🔐 Appears logged in: ${isLoggedIn ? '✅' : '❌'}`);

      return {
        success: isLoggedIn,
        statusCode: response.status,
        responseInfo: response.status === 200 ? 'Request successful' : `HTTP ${response.status}`,
      };
    } catch (error) {
      this.logger.error(`❌ Authentication test failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
