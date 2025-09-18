# How to Start Development Build on Emulator

## Quick Steps

### 1. Install Latest Development Build

```bash
cd "D:/Projects/KaraokeHub/app"
npx eas build:run --id bc8114aa-5371-43a8-9e01-39c9ffb67ae7
```

### 2. Start Development Server

```bash
npx expo start --dev-client
```

### 3. Connect App to Server

- The development build app should automatically open on your emulator
- If not, open the "KaraokeHub" app on the emulator home screen
- The app will connect to the Metro bundler automatically

## Alternative Methods

### Method 1: Use EAS Build Command (Recommended)

```bash
# List recent builds
npx eas build:list --limit=5

# Run specific build on emulator
npx eas build:run --id <BUILD_ID>
```

### Method 2: Download APK Manually

1. Visit: https://expo.dev/accounts/nquinn721/projects/karaokehub/builds/bc8114aa-5371-43a8-9e01-39c9ffb67ae7
2. Download the APK file
3. Drag and drop onto emulator
4. Install and run

## Troubleshooting

### If App Won't Connect:

1. Make sure development server is running (`npx expo start --dev-client`)
2. Check that emulator is running
3. Restart the app on emulator
4. Check the QR code matches

### If Build is Missing:

```bash
# Create new development build
npx eas build --platform android --profile development
```

### If Java Errors:

- EAS builds don't require local Java setup
- Use `npx eas build:run` instead of `npx expo run:android`

## Current Setup

- **Latest Build ID**: `bc8114aa-5371-43a8-9e01-39c9ffb67ae7`
- **Development Server**: Running on port 8081
- **Features**:
  - ✅ Google Maps integration
  - ✅ Production API connectivity (108 shows)
  - ✅ Bottom sheet with venue details
  - ✅ Hot reload for development

## Development Workflow

1. Make code changes
2. Save files (hot reload will update automatically)
3. Test on emulator
4. When ready, create new build: `npx eas build --platform android --profile development`
