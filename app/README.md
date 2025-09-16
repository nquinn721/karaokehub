# KaraokeHub Mobile App

A React Native/Expo mobile application for finding and enjoying karaoke shows.

## Features

### 🎤 Core Functionality

- **User Authentication**: Login/Register with secure token management
- **Show Discovery**: Find karaoke shows near you with map integration
- **Music Library**: Search and preview 30-second song clips
- **Show Submission**: Upload photos or manually add karaoke shows
- **Favorites**: Save your favorite songs and shows
- **Subscription System**: Freemium model with premium features

### 🗺️ Map & Location Features

- **Interactive Map**: React Native Maps with zoom-based data loading
- **Location Services**: GPS-based show discovery
- **Venue Detection**: Automatic proximity alerts when near venues
- **City/National View**: Zoom out to see city summaries or nationwide shows

### 🎵 Music Features

- **Song Search**: Real-time search with autocomplete
- **Audio Playback**: 30-second preview using Expo AV
- **Categories**: Browse by genre (Top 100, Karaoke Classics, etc.)
- **Album Artwork**: High-quality album covers
- **Volume Control**: Persistent volume settings

### 💰 Subscription & Paywall

- **Free Tier**: Limited previews and favorites
- **Ad-Free Tier**: Remove ads, same limits
- **Premium Tier**: Unlimited everything
- **Stripe Integration**: Secure payment processing

## Technology Stack

### Frontend

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build tools
- **TypeScript**: Type-safe JavaScript
- **MobX**: State management with reactive programming

### UI/UX

- **React Navigation**: Bottom tabs and stack navigation
- **Expo Vector Icons**: Consistent iconography
- **React Native Maps**: Google Maps integration
- **Expo Linear Gradient**: Beautiful gradients

### Data & Storage

- **Expo Secure Store**: Secure token storage
- **AsyncStorage**: App preferences and state persistence
- **MobX Persist Store**: State persistence across app launches

### Media & Hardware

- **Expo AV**: Audio playback for song previews
- **Expo Image Picker**: Photo selection for show submission
- **Expo Camera**: Direct camera access
- **Expo Location**: GPS and location services

## Project Structure

```
src/
├── components/          # Reusable UI components
├── navigation/          # React Navigation setup
├── screens/            # Main app screens
├── stores/             # MobX state management
│   ├── AuthStore.ts    # Authentication & user management
│   ├── ShowStore.ts    # Karaoke show data & operations
│   ├── MusicStore.ts   # Music search & playback
│   ├── MapStore.ts     # Map state & location services
│   ├── AudioStore.ts   # Audio playback management
│   ├── SubscriptionStore.ts # Paywall & subscription logic
│   ├── UIStore.ts      # App-wide UI state
│   └── index.ts        # Store composition
├── services/           # API and external services
│   └── ApiService.ts   # HTTP client with auth
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## Key Features Implementation

### Authentication Flow

- Secure token storage with Expo Secure Store
- Automatic token refresh
- Protected routes with React Navigation
- Stage name requirement modal for new users

### Map Integration

- Zoom-based data loading (8+ zoom for local, <8 for national)
- Venue proximity detection with GPS
- Interactive markers with show details
- Bottom sheet for show list

### Audio System

- HTML5 Audio replacement with Expo AV
- Persistent volume control
- Playback state management
- Preview limits based on subscription

### Paywall System

- Real-time subscription validation
- Feature gating throughout the app
- Usage tracking for free tier limits
- Stripe checkout integration

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web

# Type checking
npx tsc --noEmit
```

## Environment Configuration

The app automatically detects development vs production:

- **Development**: Uses `http://localhost:3000/api`
- **Production**: Uses `https://karaoke-hub.com/api`

## Permissions Required

### iOS

- Location (when in use)
- Camera
- Microphone
- Photo Library

### Android

- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- CAMERA
- RECORD_AUDIO
- READ_EXTERNAL_STORAGE

## Backend Integration

The mobile app connects to the same backend as the web client:

- RESTful API with JWT authentication
- Image upload for show submission parsing
- Real-time subscription status sync
- Location-based show filtering

## State Management Architecture

### MobX Stores

- **Reactive**: Automatic UI updates when data changes
- **Persistent**: Critical state survives app restarts
- **Modular**: Each feature has its own store
- **Type-safe**: Full TypeScript integration

### Key Patterns

- Computed values for derived state
- Actions for state mutations
- Observers for reactive components
- Persistence for offline-first experience

## Future Enhancements

- Push notifications for show reminders
- Social features (friends, groups)
- Offline mode for cached content
- Apple/Google Pay integration
- Voice search for songs
- AR features for venue detection
