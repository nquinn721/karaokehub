import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Centralized URL Management Service
 *
 * This service provides a single source of truth for all URLs used throughout the application.
 * It handles environment-specific URL generation and provides consistent URL management.
 *
 * Key Benefits:
 * - Single source of truth for all URLs
 * - Environment-aware (development vs production)
 * - Type-safe URL generation
 * - Easy to maintain and update
 */
@Injectable()
export class UrlService {
  private readonly isProduction: boolean;
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
  }

  /**
   * Get the frontend URL for the current environment
   */
  getFrontendUrl(): string {
    if (this.isProduction) {
      return 'https://karaoke-hub.com';
    }
    return this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  /**
   * Get the backend URL for the current environment
   */
  getBackendUrl(): string {
    if (this.isProduction) {
      return 'https://karaoke-hub.com'; // Same domain, API served from /api
    }
    return this.configService.get<string>('BACKEND_URL') || 'http://localhost:8000';
  }

  /**
   * Get the service URL (for OAuth callbacks, webhooks, etc.)
   */
  getServiceUrl(): string {
    if (this.isProduction) {
      return 'https://karaokehub-203453576607.us-central1.run.app'; // Direct Cloud Run URL
    }
    return 'http://localhost:8000';
  }

  /**
   * Build a frontend route URL
   */
  buildFrontendUrl(path: string): string {
    const baseUrl = this.getFrontendUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Build a backend API URL
   */
  buildBackendUrl(path: string): string {
    const baseUrl = this.getBackendUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Build a service URL (for OAuth callbacks)
   */
  buildServiceUrl(path: string): string {
    const baseUrl = this.getServiceUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Get OAuth redirect URLs
   */
  getOAuthUrls() {
    return {
      googleCallback: this.buildServiceUrl('/api/auth/google/callback'),
      facebookCallback: this.buildServiceUrl('/api/auth/facebook/callback'),
      githubCallback: this.buildServiceUrl('/api/auth/github/callback'),
    };
  }

  /**
   * Get subscription URLs for Stripe
   */
  getSubscriptionUrls() {
    return {
      success: this.buildFrontendUrl('/subscription/success?session_id={CHECKOUT_SESSION_ID}'),
      cancel: this.buildFrontendUrl('/subscription/cancel'),
      manage: this.buildFrontendUrl('/account'),
    };
  }

  /**
   * Get auth redirect URLs
   */
  getAuthRedirectUrls() {
    return {
      success: this.buildFrontendUrl('/dashboard'),
      error: this.buildFrontendUrl('/login?error=oauth_failed'),
      login: this.buildFrontendUrl('/login'),
    };
  }

  /**
   * Get CORS allowed origins
   */
  getAllowedOrigins(): string[] {
    if (this.isProduction) {
      return ['https://karaoke-hub.com'];
    }

    // Development origins
    const customOrigins = this.configService.get<string>('ALLOWED_ORIGINS')?.split(',') || [];
    const defaultOrigins = [
      'http://localhost:3000',
      'http://localhost:5173', // Vite default
      'http://localhost:5174', // Vite alternative
      'http://localhost:5175', // Vite alternative
      'http://localhost:5176', // Vite alternative
      'http://localhost:8000', // Backend
    ];

    return [...new Set([...customOrigins, ...defaultOrigins])];
  }

  /**
   * Get WebSocket origins
   */
  getWebSocketOrigins(): string[] {
    return this.getAllowedOrigins();
  }

  /**
   * Debug information about current URL configuration
   */
  getUrlConfig() {
    return {
      environment: this.configService.get<string>('NODE_ENV'),
      isProduction: this.isProduction,
      isDevelopment: this.isDevelopment,
      frontend: this.getFrontendUrl(),
      backend: this.getBackendUrl(),
      service: this.getServiceUrl(),
      allowedOrigins: this.getAllowedOrigins(),
    };
  }
}
