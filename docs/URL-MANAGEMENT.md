# 🌐 URL Management & Domain Configuration

## Overview

This document outlines the centralized URL management system and domain configuration for KaraokeHub.

## 🎯 Domain Setup

### Production Domain: `https://karaoke-hub.com`

- **Frontend**: Served from the same domain as the backend
- **Backend API**: Available at `https://karaoke-hub.com/api/*`
- **Direct Cloud Run URL**: `https://karaokehub-203453576607.us-central1.run.app` (used for OAuth callbacks)

### Development URLs

- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend**: `http://localhost:8000`

## 🏗️ Centralized URL Management

### UrlService (`src/config/url.service.ts`)

A centralized service that manages all URLs used throughout the application:

```typescript
// Get environment-specific URLs
urlService.getFrontendUrl(); // https://karaoke-hub.com (prod) or http://localhost:5173 (dev)
urlService.getBackendUrl(); // https://karaoke-hub.com (prod) or http://localhost:8000 (dev)
urlService.getServiceUrl(); // https://karaokehub-203453576607.us-central1.run.app (for OAuth)

// Build specific URLs
urlService.buildFrontendUrl('/dashboard'); // https://karaoke-hub.com/dashboard
urlService.buildBackendUrl('/api/users'); // https://karaoke-hub.com/api/users

// Get pre-configured URL sets
urlService.getOAuthUrls(); // OAuth callback URLs
urlService.getSubscriptionUrls(); // Stripe subscription URLs
urlService.getAuthRedirectUrls(); // Auth success/error URLs
urlService.getAllowedOrigins(); // CORS origins
```

### Benefits

- ✅ **Single source of truth** for all URLs
- ✅ **Environment-aware** (automatically switches between dev/prod)
- ✅ **Type-safe** URL generation
- ✅ **Easy maintenance** - change URLs in one place
- ✅ **Consistent behavior** across all services

## 🔧 Environment Variables

### Production Configuration

```yaml
# cloudrun-service.yaml
- name: FRONTEND_URL
  value: 'https://karaoke-hub.com'
- name: BACKEND_URL
  value: 'https://karaoke-hub.com' # Same domain, API served from /api
- name: ALLOWED_ORIGINS
  value: 'https://karaoke-hub.com'
```

### Development Configuration

```bash
# .env
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176
```

## 📝 Updated Components

### 1. Authentication (`src/auth/`)

- **GoogleStrategy**: Uses `urlService.getOAuthUrls().googleCallback`
- **AuthController**: All OAuth redirects use `urlService.buildFrontendUrl()`
- **Simplified logic**: No more manual URL building or environment detection

### 2. Subscription Service (`src/subscription/`)

- **Checkout URLs**: Uses `urlService.getSubscriptionUrls()`
- **Portal URLs**: Uses centralized URL management

### 3. Main Application (`src/main.ts`)

- **CORS**: Uses `urlService.getAllowedOrigins()`
- **Logging**: Shows correct frontend URL for each environment

### 4. WebSocket Gateway (`src/websocket/`)

- **CORS origins**: Uses `urlService.getWebSocketOrigins()`

### 5. App Controller (`src/app.controller.ts`)

- **Debug endpoints**: Use `urlService.getUrlConfig()` for comprehensive URL info

## 🚀 Usage Examples

### In a Service

```typescript
@Injectable()
export class MyService {
  constructor(private urlService: UrlService) {}

  async sendEmail() {
    const loginUrl = this.urlService.buildFrontendUrl('/login');
    // Use loginUrl in email template
  }
}
```

### In a Controller

```typescript
@Controller()
export class MyController {
  constructor(private urlService: UrlService) {}

  @Get('redirect')
  redirect(@Res() res: Response) {
    const successUrl = this.urlService.getAuthRedirectUrls().success;
    res.redirect(successUrl);
  }
}
```

## 🔍 Debug Information

### Check URL Configuration

```bash
curl https://karaoke-hub.com/api/env-info
curl https://karaoke-hub.com/api/oauth-debug
```

These endpoints now provide comprehensive URL configuration information using the UrlService.

## 🛠️ Migration Notes

### Before (Scattered URLs)

```typescript
// ❌ URLs hardcoded everywhere
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const successUrl = `${frontendUrl}/auth/success?token=${token}`;

// ❌ Manual environment detection
const isProduction = process.env.NODE_ENV === 'production';
const backendUrl = isProduction
  ? process.env.BACKEND_URL || 'https://karaokehub-203453576607.us-central1.run.app'
  : 'http://localhost:8000';
```

### After (Centralized Management)

```typescript
// ✅ Clean, centralized URL management
const successUrl = this.urlService.buildFrontendUrl(`/auth/success?token=${token}`);
const callbackUrl = this.urlService.getOAuthUrls().googleCallback;
```

## 📋 TODO / Future Improvements

1. **Add URL validation** - Ensure all URLs are valid
2. **Add URL caching** - Cache computed URLs for performance
3. **Add subdomain support** - For multi-tenant scenarios
4. **Add A/B testing URLs** - Different URLs for testing
5. **Add region-specific URLs** - For geo-distributed deployments

## 🔗 Related Files

- `src/config/url.service.ts` - Main URL service
- `src/config/config.module.ts` - Module configuration
- `cloudrun-service.yaml` - Production environment variables
- `.env` - Development environment variables
- All OAuth strategies and controllers - Updated to use UrlService

---

**Last Updated**: August 16, 2025  
**Author**: Development Team  
**Status**: ✅ Implemented and Deployed
