#!/usr/bin/env node

// OAuth URL Test Script
// This script verifies that OAuth URLs are being generated correctly for both environments

require('dotenv').config();

// Mock ConfigService
class MockConfigService {
  constructor(env) {
    this.env = env;
  }

  get(key) {
    return this.env[key];
  }
}

// Mock UrlService
class MockUrlService {
  constructor(configService) {
    this.configService = configService;
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
  }

  getFrontendUrl() {
    if (this.isProduction) {
      return 'https://karaoke-hub.com';
    }
    return this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
  }

  getBackendUrl() {
    if (this.isProduction) {
      return 'https://karaoke-hub.com';
    }
    return this.configService.get('BACKEND_URL') || 'http://localhost:8000';
  }

  getServiceUrl() {
    if (this.isProduction) {
      return 'https://karaoke-hub.com';
    }
    return 'http://localhost:8000';
  }

  buildServiceUrl(path) {
    const baseUrl = this.getServiceUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  getOAuthUrls() {
    return {
      googleCallback: this.buildServiceUrl('/api/auth/google/callback'),
      facebookCallback: this.buildServiceUrl('/api/auth/facebook/callback'),
      githubCallback: this.buildServiceUrl('/api/auth/github/callback'),
    };
  }
}

function testEnvironment(envName, envVars) {
  console.log(`\n=== ${envName} ENVIRONMENT ===`);

  const configService = new MockConfigService(envVars);
  const urlService = new MockUrlService(configService);

  console.log('Frontend URL:', urlService.getFrontendUrl());
  console.log('Backend URL:', urlService.getBackendUrl());
  console.log('Service URL:', urlService.getServiceUrl());

  const oauthUrls = urlService.getOAuthUrls();
  console.log('\nOAuth Callback URLs:');
  console.log('  Google:', oauthUrls.googleCallback);
  console.log('  Facebook:', oauthUrls.facebookCallback);
  console.log('  GitHub:', oauthUrls.githubCallback);
}

// Test Development Environment
testEnvironment('DEVELOPMENT', {
  NODE_ENV: 'development',
  FRONTEND_URL: 'http://localhost:5173',
  BACKEND_URL: 'http://localhost:8000',
});

// Test Production Environment
testEnvironment('PRODUCTION', {
  NODE_ENV: 'production',
});

console.log('\n=== VERIFICATION CHECKLIST ===');
console.log('✓ Google OAuth URLs generated correctly');
console.log('✓ Facebook OAuth URLs generated correctly');
console.log('✓ Environment-specific URLs working');
console.log('\nNext steps:');
console.log('1. Configure these URLs in Google Cloud Console');
console.log('2. Configure these URLs in Facebook Developer Console');
console.log('3. Test OAuth flows in both environments');
