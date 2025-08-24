# Location Tracking Implementation

## Overview

A comprehensive location-based tracking system that monitors user position every 30 seconds and provides real-time show proximity information through a custom modal in the admin dashboard.

## Features Implemented

### 🎯 Core Functionality

- **Geo-location tracking** every 30 seconds when modal is active
- **Reverse geocoding** to convert coordinates to readable addresses
- **Proximity detection** for shows within 10 meters
- **Closest show calculation** with distance information
- **Google Maps screenshot** showing current location with maximum zoom

### 🖥️ Frontend Components

#### LocationTrackingModal (`client/src/components/modals/LocationTrackingModal.tsx`)

- Real-time location tracking with 30-second intervals
- Integration with existing geolocation services
- Custom modal using Material-UI components
- Displays:
  - Current address from coordinates
  - List of shows within 10 meters
  - Closest show with distance
  - Google Maps static image at current location (zoom level 20)
  - Location accuracy information

#### Admin Dashboard Integration

- Added "Location Tracking" button in `AdminDashboardPageTabbed.tsx`
- Available on both desktop and mobile views
- Uses existing admin dashboard styling patterns

### 🔧 Backend Services

#### LocationController (`src/location/location.controller.ts`)

New API endpoints for location-based operations:

- `GET /location/test` - Service health check
- `GET /location/reverse-geocode` - Convert coordinates to address
- `GET /location/nearby-shows` - Get shows within specified distance for any day
- `GET /location/proximity-check` - Check for shows within specific radius (optimized for 10m checks)

#### GeocodingService Enhanced (`src/geocoding/geocoding.service.ts`)

- Added `reverseGeocode()` method for backend coordinate-to-address conversion
- Google Maps API integration for accurate address resolution

#### New Modules

- `LocationModule` - Manages location-based functionality
- `GeocodingModule` - Handles geocoding services

### 📡 API Integration

#### Updated ApiStore (`client/src/stores/ApiStore.ts`)

New location endpoints:

```typescript
location: {
  test: '/location/test',
  reverseGeocode: (lat, lng) => '/location/reverse-geocode?lat=${lat}&lng=${lng}',
  nearbyShows: (lat, lng, maxDistance?, day?) => '/location/nearby-shows...',
  proximityCheck: (lat, lng, radius?) => '/location/proximity-check...'
}
```

## 🔍 Technical Details

### Distance Calculations

- Uses Haversine formula for accurate distance calculations
- Backend converts miles to meters for consistent units
- Supports both metric (meters) and imperial (miles) measurements

### Geolocation Accuracy

- Requests high-accuracy GPS positioning
- Displays accuracy radius to user
- 15-second timeout for location requests
- Graceful fallback for location errors

### Google Maps Integration

- Static Maps API for location screenshots
- 400x300 pixel images with red markers
- Zoom level 20 for maximum detail
- Automatic API key management

### Performance Optimizations

- Backend processing for show filtering and distance calculations
- Caching of geocoding results (24-hour client-side cache)
- Efficient proximity algorithms
- Minimal API calls through consolidated endpoints

## 🎮 Usage

### For Admins

1. Navigate to Admin Dashboard
2. Click "Location Tracking" button
3. Allow location permissions when prompted
4. Modal automatically starts tracking every 30 seconds
5. View real-time proximity information

### Data Displayed

- **Current Address**: Human-readable address from coordinates
- **Shows Within 10m**: List of karaoke shows within 10 meters
- **Closest Show**: Nearest show with exact distance
- **Location Map**: Google Maps screenshot with current position
- **Accuracy Info**: GPS accuracy radius

## 🔧 Configuration

### Environment Variables Required

- `GOOGLE_MAPS_API_KEY` - For geocoding and static maps
- Database connection for show data

### API Permissions

- Google Maps Geocoding API
- Google Maps Static Maps API

## 🚀 Future Enhancements

- Push notifications when entering show vicinity
- Historical location tracking
- Geofencing for automatic check-ins
- Integration with venue management system
- Mobile app support with background location tracking

## 📱 Mobile Support

- Responsive design for mobile devices
- Touch-friendly button layout in admin drawer
- Optimized modal sizing for small screens
- High-accuracy location requests optimized for mobile GPS
