# KaraokeHub Mobile App

## 📱 App Structure

### Main Application
- **Location**: `/app/` - Complete React Native + Expo mobile application
- **Development Server**: `npx expo start --dev-client`
- **Production Build**: `npx eas build --platform android --profile production`

### Configuration Files
- **EAS Build**: `/app/eas.json` - Build configuration for development and production
- **App Config**: `/app/app.config.js` - Expo configuration with Google Maps API key
- **Package**: `/app/package.json` - Dependencies and scripts

### Key Features
- ✅ **Interactive Google Maps** with venue markers
- ✅ **Bottom Sheet UI** with show listings
- ✅ **Production API** connectivity to karaoke-hub.com
- ✅ **Location Services** for finding nearby shows
- ✅ **Hot Module Reload** for development
- ✅ **Development Builds** for testing on devices

## 🚀 Development

### Latest Build
- **Development Build**: https://expo.dev/accounts/nquinn721/projects/karaokehub/builds/66376671-1bdc-488b-8b6b-21f2c07582be
- **Features**: Fixed fetch loop issue, Google Maps integration, production API connectivity

### Development Server
```bash
cd app
npx expo start --dev-client --port 8082
```

### Testing API
```bash
cd app
node testApi.js  # Tests production API connectivity
```

## 🛠️ Recent Fixes

### Fetch Loop Issue (Fixed)
- **Problem**: Aggressive debouncing was preventing initial data loads
- **Solution**: Reduced debounce time from 2000ms to 500ms and allowed initial fetches
- **Result**: App now properly loads 108 shows from production API

### Google Maps Integration (Fixed)
- **Problem**: Missing API key causing map initialization errors
- **Solution**: Added Google Maps API key directly to app.config.js
- **Result**: Full interactive maps with venue markers

### Project Organization (Improved)
- **Mobile Configs**: Moved to `/mobile/` (with copies in `/app/` for EAS)
- **Documentation**: Centralized in `/docs/mobile/`
- **Root Cleanup**: Reduced clutter in project root

## 📋 Documentation

- **HMR Guide**: `/docs/mobile/HMR_GUIDE.md` - Hot Module Reload setup
- **API Testing**: Built-in test script for production connectivity
- **Build Process**: EAS build system for development and production APKs

## 🔧 Next Steps

1. **Install Latest APK**: Download from the build link above
2. **Connect to Dev Server**: Scan QR code with development build
3. **Test Full Features**: Interactive maps, show browsing, location services
4. **Production Deploy**: Use `npx eas build --platform android --profile production`
