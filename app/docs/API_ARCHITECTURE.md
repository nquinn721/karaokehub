# API Service Architecture

This document explains the centralized API service architecture for the KaraokeHub mobile app.

## Overview

The mobile app now uses a centralized API service pattern that mirrors the web application's ApiStore structure. This ensures consistency across platforms and provides a single source of truth for all API configurations.

## Structure

### BaseApiService (`src/services/BaseApiService.ts`)

The main API service that handles:

- **Environment Detection**: Automatically switches between development and production URLs
- **Centralized Endpoints**: All API endpoints defined in one place
- **Authentication**: JWT token management with automatic refresh
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE with consistent error handling
- **File Uploads**: Utility methods for image and file uploads

### ApiService (`src/services/ApiService.ts`)

Legacy wrapper that maintains backward compatibility while using BaseApiService internally.

## Configuration

### Environment URLs

- **Development**: `http://localhost:8000/api` (matches web app)
- **Production**: `https://karaoke-hub.com/api`

### Usage Examples

```typescript
import { baseApiService } from '../services/BaseApiService';
// or for backward compatibility:
import { apiService } from '../services/ApiService';

// Get shows
const shows = await baseApiService.get(baseApiService.endpoints.shows.list);

// Search shows with location
const nearbyShows = await baseApiService.get(
  baseApiService.endpoints.shows.nearby(lat, lng, radius),
);

// Authenticate
const response = await baseApiService.post(baseApiService.endpoints.auth.login, {
  email,
  password,
});
```

## Endpoints

The API service includes all endpoints from the web app:

- **Auth**: login, register, refresh, profile, OAuth providers
- **Shows**: CRUD operations, search, nearby, favorites
- **Users**: profile management
- **Venues**: search, create, details
- **Location**: geocoding, proximity checks, nearby searches
- **Music**: search, suggestions, favorites
- **Subscriptions**: Stripe integration
- **Upload**: image and file handling
- **Admin**: statistics and management

## Benefits

1. **Consistency**: Matches web app's ApiStore structure
2. **Type Safety**: Full TypeScript support with proper typing
3. **Centralized Configuration**: Single place to manage all URLs and endpoints
4. **Environment Aware**: Automatic switching between dev/prod
5. **Authentication**: Built-in JWT handling with refresh logic
6. **Error Handling**: Consistent error handling across all requests
7. **Backward Compatibility**: Existing code continues to work

## Migration

Existing code will continue to work without changes. For new code, prefer using `baseApiService` directly:

```typescript
// Old (still works)
import { apiService } from '../services/ApiService';

// New (preferred)
import { baseApiService } from '../services/BaseApiService';
```

## Authentication

The service automatically:

- Adds JWT tokens to requests
- Handles token refresh on 401 responses
- Stores tokens securely using Expo SecureStore
- Clears tokens on refresh failure
