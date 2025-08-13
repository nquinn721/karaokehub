# 🏪 MobX Store Architecture with Centralized API Management

## Overview

The application uses a centralized API management system built on MobX stores, where all HTTP requests and WebSocket connections are managed through a base `ApiStore`. This ensures consistent URL handling, error management, and environment detection.

## Store Structure

### 🔧 ApiStore (Base Store)

- **Location**: `client/src/stores/ApiStore.ts`
- **Purpose**: Centralized API configuration and HTTP client management
- **Features**:
  - Environment-aware URLs (dev vs production)
  - Axios instance with interceptors
  - Authentication token management
  - Loading states and error handling
  - Centralized endpoint definitions

### 🔐 AuthStore

- **Purpose**: User authentication and authorization
- **API Dependencies**: Uses `apiStore` for all auth-related requests
- **Features**: Login, register, logout, profile management, OAuth

### 🎭 ShowStore

- **Purpose**: Karaoke show management
- **API Dependencies**: Uses `apiStore` for show CRUD operations
- **Features**: Fetch shows, create/update/delete, filter by day/vendor/KJ

### ⭐ FavoriteStore

- **Purpose**: User favorites management
- **API Dependencies**: Uses `apiStore` for favorite operations
- **Features**: Add/remove favorites, check favorite status

### 🏢 VendorStore

- **Purpose**: Venue/vendor management
- **API Dependencies**: Uses `apiStore` for vendor CRUD operations
- **Features**: Manage karaoke venues and their information

### 🔌 WebSocketStore

- **Purpose**: Real-time communication
- **API Dependencies**: Uses `apiStore.websocketURL` for connection
- **Features**: Room management, chat, live karaoke sessions

### 🎨 UIStore

- **Purpose**: UI state management
- **API Dependencies**: None (purely UI state)

## Environment Detection

### Development

```typescript
// URLs automatically resolve to:
baseURL: 'http://localhost:8000/api';
websocketURL: 'ws://localhost:8000';
```

### Production

```typescript
// URLs automatically resolve to:
baseURL: '${window.location.origin}/api'; // Uses current domain
websocketURL: 'wss://${window.location.host}'; // Uses current domain with secure WebSocket
```

## API Endpoint Management

All API endpoints are centrally defined in `ApiStore.endpoints`:

```typescript
apiStore.endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    // ...
  },
  shows: {
    base: '/shows',
    byId: (id: string) => `/shows/${id}`,
    byDay: (day: string) => `/shows?day=${day}`,
    // ...
  },
  // ...
};
```

## Usage Examples

### ✅ Correct Usage (Using ApiStore)

```typescript
// In any store
async fetchShows() {
  const response = await apiStore.get(apiStore.endpoints.shows.base);
  // Handle response...
}

// WebSocket connection
const socket = io(apiStore.websocketURL);
```

### ❌ Incorrect Usage (Hardcoded URLs)

```typescript
// DON'T DO THIS - hardcoded URLs
const response = await axios.get('http://localhost:8000/api/shows');
const socket = io('ws://localhost:8000');
```

## Authentication Flow

1. **Login**: `AuthStore.login()` calls `apiStore.post()`
2. **Token Storage**: `AuthStore` saves token and calls `apiStore.setToken()`
3. **Auto Headers**: `ApiStore` automatically adds `Authorization` header to all requests
4. **Token Persistence**: Token is saved in localStorage and restored on app startup

## Error Handling

All API errors are handled consistently through `ApiStore` interceptors:

- **401 Unauthorized**: Automatically redirects to login
- **Loading States**: Managed automatically for all requests
- **Error Messages**: Standardized error format across all stores

## Benefits

### ✅ Centralized Configuration

- Single place to manage all API URLs
- Environment detection handled automatically
- No hardcoded URLs anywhere in the application

### ✅ Consistent Error Handling

- Standardized error responses
- Automatic loading state management
- Centralized authentication handling

### ✅ Type Safety

- Full TypeScript support
- Strongly typed API responses
- IntelliSense support for all endpoints

### ✅ Development Experience

- Easy to switch between environments
- Consistent debugging experience
- Single point of configuration

## File Structure

```
client/src/stores/
├── ApiStore.ts          # Base API management
├── AuthStore.ts         # Authentication (uses ApiStore)
├── ShowStore.ts         # Show management (uses ApiStore)
├── FavoriteStore.ts     # Favorites (uses ApiStore)
├── VendorStore.ts       # Vendors (uses ApiStore)
├── WebSocketStore.ts    # WebSocket (uses ApiStore)
├── UIStore.ts           # UI state only
└── index.ts             # Store composition and exports
```

## Integration Guidelines

### For New Stores

1. Import `apiStore` from `./ApiStore`
2. Use `apiStore.get()`, `apiStore.post()`, etc. for HTTP requests
3. Use `apiStore.endpoints` for URL management
4. Use `apiStore.websocketURL` for WebSocket connections
5. Never hardcode URLs or create separate axios instances

### For Components

1. Import stores from `./stores`
2. Use MobX `observer` wrapper for reactive components
3. Access API state through stores, never directly
4. Let stores handle all API communication

This architecture ensures maintainable, scalable, and consistent API management across the entire application! 🎉
