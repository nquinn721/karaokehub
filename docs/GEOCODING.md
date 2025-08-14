# Geocoding Implementation

This document describes the real geocoding implementation that replaced the hardcoded pattern matching system.

## Overview

The application now uses the Google Maps Geocoding API to convert addresses to precise latitude/longitude coordinates for accurate map positioning.

## Features

### Frontend (Client)
- **Real-time geocoding** using Google Maps Geocoding API
- **Intelligent caching** with localStorage to avoid repeated API calls
- **Batch geocoding** for processing multiple addresses
- **Fallback coordinates** if geocoding fails
- **Cache management** with expiration and cleanup

### Backend (Server)  
- **Server-side geocoding** for new shows during creation/updates
- **Batch geocoding endpoint** for processing existing shows
- **Database storage** of coordinates in `lat` and `lng` columns
- **Automatic geocoding** when address changes

## API Usage

### Frontend Geocoding Service

```typescript
import { geocodingService } from '../utils/geocoding';

// Set API key (done automatically via apiStore)
geocodingService.setApiKey('YOUR_API_KEY');

// Geocode a single address
const result = await geocodingService.geocodeAddress('123 Main St, New York, NY');
// Returns: { lat: 40.7128, lng: -74.0060, formatted_address: "..." }

// Geocode multiple addresses
const results = await geocodingService.geocodeMultipleAddresses([
  '123 Main St, New York, NY',
  'Times Square, New York, NY'
]);

// Cache management
geocodingService.clearCache();
const stats = geocodingService.getCacheStats();
```

### Backend Geocoding

```typescript
// Automatic geocoding when creating shows
const show = await showService.create({
  vendorId: '...',
  djId: '...',
  address: '123 Main St, New York, NY',
  // lat/lng will be automatically geocoded
});

// Manual batch geocoding via API endpoint
POST /shows/geocode
// Returns: { processed: 10, geocoded: 8, errors: 2 }
```

## Database Schema

The `shows` table now includes coordinate columns:

```sql
ALTER TABLE shows ADD COLUMN lat DECIMAL(10,8) NULL COMMENT 'Latitude coordinate';
ALTER TABLE shows ADD COLUMN lng DECIMAL(11,8) NULL COMMENT 'Longitude coordinate';
CREATE INDEX IDX_shows_coordinates ON shows (lat, lng);
```

## Migration

Run this migration to add coordinate columns:

```bash
# Migration file: src/migrations/1755137000000-AddCoordinatesToShows.ts
```

## Caching Strategy

### Client-Side Caching
- **Storage**: Browser localStorage
- **Duration**: 24 hours
- **Key**: Normalized address (lowercase, trimmed)
- **Cleanup**: Automatic expiration of old entries

### Benefits
- Reduces API calls and costs
- Improves performance for repeated address lookups
- Works offline for cached addresses
- Automatic cache size management

## Error Handling

- **Invalid addresses**: Returns fallback NYC coordinates
- **API quota exceeded**: Logs warning, uses fallback
- **Network errors**: Gracefully handled with fallback
- **Rate limiting**: Built-in delays between batch requests

## API Rate Limiting

- **Batch processing**: 10 addresses per batch with 100ms delays
- **Individual requests**: Respects Google's rate limits
- **Error recovery**: Continues processing even if some addresses fail

## Configuration

### Environment Variables
- `GOOGLE_MAPS_API_KEY`: Required for both client and server
- API key must have Geocoding API enabled

### API Key Setup
1. Enable Geocoding API in Google Cloud Console  
2. Add API key to environment variables
3. Configure domain restrictions if needed

## Performance Optimizations

1. **Caching**: 24-hour localStorage cache
2. **Batch processing**: Reduces API overhead  
3. **Conditional geocoding**: Only geocodes when needed
4. **Fallback handling**: Fast fallback for failed requests

## Migration from Hardcoded System

### What Was Removed
- Hardcoded city pattern matching (90+ patterns)
- State-level fallback mappings
- Random coordinate variations

### What Was Added
- Real Google Maps Geocoding API integration
- Database coordinate storage
- Intelligent caching system
- Backend geocoding service

### Benefits
- ✅ Handles any address worldwide
- ✅ Precise positioning for exact locations  
- ✅ No maintenance of hardcoded patterns
- ✅ Professional geocoding accuracy
- ✅ Scales to any location

## Testing

Run the geocoding test:

```typescript
import { testGeocoding } from '../utils/geocoding-test';
await testGeocoding();
```

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Ensure `GOOGLE_MAPS_API_KEY` is set
   - Check if Geocoding API is enabled

2. **"OVER_QUERY_LIMIT"**  
   - Check Google Cloud billing
   - Implement request throttling

3. **"REQUEST_DENIED"**
   - Verify API key permissions
   - Check domain restrictions

4. **Fallback coordinates**
   - Shows appear in NYC when geocoding fails
   - Check console for geocoding errors

### Cache Issues

Clear geocoding cache if addresses seem outdated:

```javascript
// In browser console
geocodingService.clearCache();
```
