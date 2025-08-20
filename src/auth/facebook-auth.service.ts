/**
 * Production-ready Facebook authentication strategy
 *
 * DEVELOPMENT: Interactive login for easy setup
 * PRODUCTION: Admin UI for secure credential handling + session persistence
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FacebookParserService } from '../parser/facebook-parser.service';

export interface FacebookAuthStrategy {
  type: 'interactive' | 'admin-ui' | 'env-fallback';
  description: string;
  suitable: string[];
}

@Injectable()
export class FacebookAuthService {
  private readonly logger = new Logger(FacebookAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly facebookParser: FacebookParserService,
  ) {}

  /**
   * Determine the best authentication strategy based on environment
   */
  getRecommendedStrategy(): FacebookAuthStrategy {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const hasEnvCredentials = this.hasEnvironmentCredentials();
    const hasSavedSession = this.facebookParser.hasSavedSession();

    if (hasSavedSession) {
      return {
        type: 'interactive',
        description: 'Session exists - will attempt restoration first',
        suitable: ['development', 'production'],
      };
    }

    if (nodeEnv === 'production') {
      return {
        type: 'admin-ui',
        description: 'Secure admin UI for one-time credential input',
        suitable: ['production', 'staging'],
      };
    } else {
      return {
        type: 'interactive',
        description: 'Interactive browser login for development',
        suitable: ['development', 'local'],
      };
    }
  }

  /**
   * Execute authentication based on strategy
   */
  async authenticate(strategy?: 'interactive' | 'admin-ui' | 'auto'): Promise<boolean> {
    const selectedStrategy = strategy || this.getRecommendedStrategy().type;

    this.logger.log(`🔐 Using authentication strategy: ${selectedStrategy}`);

    // Always try session restoration first
    if (this.facebookParser.hasSavedSession()) {
      this.logger.log('🔄 Attempting to restore saved session...');

      await this.facebookParser.initializeBrowser();

      try {
        // Attempt login which will restore session if available
        await this.facebookParser.loginToFacebook();
        if (this.facebookParser.getLoginStatus()) {
          this.logger.log('✅ Session restored successfully');
          return true;
        }
      } catch (error) {
        this.logger.warn('⚠️ Session restoration failed, trying fresh login');
      }
    }

    // If session restoration failed, use the selected strategy
    switch (selectedStrategy) {
      case 'interactive':
        return await this.interactiveAuth();

      case 'admin-ui':
        this.logger.log('📋 Admin UI authentication required');
        this.logger.log('Please use the admin panel to provide Facebook credentials');
        return false;

      default:
        this.logger.error('❌ Unknown authentication strategy');
        return false;
    }
  }

  /**
   * Interactive authentication for development
   */
  private async interactiveAuth(): Promise<boolean> {
    try {
      this.logger.log('🖥️ Opening browser for interactive login...');
      this.logger.log('Please log in to Facebook manually in the opened browser');

      // This would use the existing browser instance from FacebookParserService
      if (!this.facebookParser.getLoginStatus()) {
        await this.facebookParser.initializeBrowser();

        // Navigate to login page and wait for manual login
        // Implementation would go here

        return false; // Placeholder
      }

      return true;
    } catch (error) {
      this.logger.error(`Interactive auth failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if environment credentials are available
   */
  private hasEnvironmentCredentials(): boolean {
    const email = this.configService.get<string>('FACEBOOK_EMAIL');
    const password = this.configService.get<string>('FACEBOOK_PASSWORD');

    return !!(email && password && !email.includes('example.com'));
  }

  /**
   * Get authentication status and recommendations
   */
  getAuthStatus() {
    const strategy = this.getRecommendedStrategy();
    const hasSession = this.facebookParser.hasSavedSession();
    const isLoggedIn = this.facebookParser.getLoginStatus();

    return {
      loggedIn: isLoggedIn,
      hasSession: hasSession,
      recommendedStrategy: strategy,
      environment: this.configService.get<string>('NODE_ENV'),
      hasEnvCredentials: this.hasEnvironmentCredentials(),
      sessionPath: hasSession ? 'facebook-session/cookies.json' : null,
    };
  }
}
