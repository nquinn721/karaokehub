/**
 * Interactive Facebook login - opens browser for manual login
 * Good for development/local use, saves session for future use
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

@Injectable()
export class InteractiveFacebookLoginService {
  private readonly logger = new Logger(InteractiveFacebookLoginService.name);
  private readonly sessionDir = path.join(process.cwd(), 'facebook-session');
  private readonly cookiesPath = path.join(this.sessionDir, 'cookies.json');
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  /**
   * Interactive login - opens browser window for user to manually log in
   */
  async interactiveLogin(): Promise<boolean> {
    try {
      this.logger.log('🖥️  Opening browser for interactive Facebook login...');

      // Launch browser in visible mode
      this.browser = await puppeteer.launch({
        headless: false, // Keep visible for user interaction
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--window-size=1200,800',
        ],
      });

      this.page = await this.browser.newPage();

      // Navigate to Facebook login
      await this.page.goto('https://www.facebook.com/login', {
        waitUntil: 'networkidle2',
      });

      this.logger.log('🔑 Please log in to Facebook in the opened browser window...');
      this.logger.log('⏳ Waiting for successful login (checking every 5 seconds)...');

      // Wait for user to log in (check every 5 seconds)
      let loginSuccessful = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (!loginSuccessful && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        try {
          const currentUrl = this.page.url();

          // Check if we're logged in (not on login page)
          if (
            !currentUrl.includes('/login') &&
            currentUrl.includes('facebook.com') &&
            !currentUrl.includes('/checkpoint/')
          ) {
            // Double-check by looking for user-specific elements
            const loggedInElements = await this.page.$('[data-testid="user-menu"]');
            if (loggedInElements) {
              loginSuccessful = true;
              this.logger.log('✅ Login detected! Saving session...');

              // Save cookies for future use
              await this.saveCookies();

              this.logger.log('🍪 Session saved successfully!');
              this.logger.log('🎉 You can now close the browser window.');

              return true;
            }
          }
        } catch (error) {
          // Continue waiting
        }

        if (attempts % 12 === 0) {
          // Every minute
          this.logger.log(`⏳ Still waiting for login... (${attempts * 5}s elapsed)`);
        }
      }

      this.logger.warn('⏰ Login timeout - please try again');
      return false;
    } catch (error) {
      this.logger.error(`❌ Interactive login failed: ${error.message}`);
      return false;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Save cookies to file
   */
  private async saveCookies(): Promise<void> {
    try {
      if (!this.page) return;

      const cookies = await this.page.cookies();

      // Ensure session directory exists
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true });
      }

      fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
      this.logger.log(`💾 Saved ${cookies.length} cookies to session file`);
    } catch (error) {
      this.logger.error(`Failed to save cookies: ${error.message}`);
    }
  }

  /**
   * Check if saved session exists
   */
  hasSavedSession(): boolean {
    return fs.existsSync(this.cookiesPath);
  }
}
