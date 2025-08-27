# React Native Maps Solution

## Problem
`expo-maps` cannot run in Expo Go - it requires a development build with native code.

## Solutions

### Option 1: Use react-native-maps (Expo Go Compatible)
```bash
# Install react-native-maps
npm install react-native-maps

# Update your ShowsMapScreen.tsx to use react-native-maps instead of expo-maps
```

Update your imports and components:
```tsx
// OLD (expo-maps):
import { GoogleMaps } from 'expo-maps';
<GoogleMaps.View ... />

// NEW (react-native-maps):
import MapView, { Marker } from 'react-native-maps';
<MapView ... />
```

### Option 2: Use Development Build with expo-maps (Current Choice)
```bash
# Generate native code
npx expo prebuild --clean

# Run development build
npx expo run:android    # For Android
npx expo run:ios        # For iOS
```

### Option 3: Use EAS Build
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Build for development
eas build --profile development --platform android
```

## Current Configuration Status
✅ expo-maps installed (v0.11.0)
✅ react-native-maps removed (conflicting package)
✅ Google Maps API key configured in app.json
✅ Native Android project generated
❌ Need to successfully run development build

## Next Steps
1. Fix Metro bundler issues
2. Run `npx expo run:android` successfully
3. Test maps on device/emulator

## Alternative Quick Fix
If you need maps working immediately, temporarily switch to react-native-maps:

```bash
npm install react-native-maps
```

Then update your ShowsMapScreen.tsx to use MapView instead of GoogleMaps.View.
