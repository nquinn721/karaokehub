# Google Sign-In Mobile Fix Guide

## Problem
The mobile app was showing the error: 
```
[runtime not ready]: Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found.
```

## Root Cause
1. **Outdated Development Build**: The current dev build (bc8114aa-5371-43a8-9e01-39c9ffb67ae7) was built before Google Sign-In native module was properly configured
2. **Client ID Mismatch**: Mobile app was using different Google OAuth client ID (479508459081) than backend (203453576607)
3. **Missing iOS URL Scheme Configuration**: The Google Sign-In plugin needed proper URL scheme configuration

## Fixes Applied

### 1. Updated Google Sign-In Configuration
**File**: `app/src/services/OAuthService.ts`
- ✅ Changed webClientId from `479508459081-8nlnt4fh1s1sccbkb46qrql3a4f7oj59` to `203453576607-ivpb2s4r8lnlkfk3osb6m0jb1pgdjd1` (matches backend)
- ✅ Updated iOS client ID placeholder to use correct project ID

### 2. Fixed app.json Plugin Configuration  
**File**: `app/app.json`
- ✅ Added proper Google Sign-In plugin configuration with iOS URL scheme
- ✅ Updated iosUrlScheme to match the correct client ID

### 3. Building New Development Build
- ✅ Started new EAS build with ID: `5809f5de-c939-4167-b838-6bd025b9d58a`
- ✅ This build includes the Google Sign-In native module properly configured

## Client IDs by Platform

| Platform | Client ID | Usage |
|----------|-----------|-------|
| Backend (Web) | 203453576607-ivpb2s4r8lnlkfk3osb6m0jb1pgdjd1 | Server-side OAuth validation |
| Frontend (Web) | 203453576607-ha4529p5nc6hs1i0h2jd7sl9601fg8tj | Web client Google Sign-In |
| Mobile (iOS/Android) | 203453576607-ivpb2s4r8lnlkfk3osb6m0jb1pgdjd1 | React Native Google Sign-In |

## Next Steps

### When New Build Completes
1. **Install New Development Build**:
   ```bash
   # Check build status
   npx eas build:list --limit=1
   
   # Install when ready
   npx eas build:run --id 5809f5de-c939-4167-b838-6bd025b9d58a
   ```

2. **Update Development Guide**:
   - Replace old build ID in `EMULATOR-DEV-BUILD-GUIDE.md`
   - Test Google Sign-In functionality

3. **Test Google Sign-In Flow**:
   - Start development server: `npx expo start --dev-client`
   - Open app on emulator/device
   - Try Google Sign-In button
   - Verify token is sent to backend correctly

## Troubleshooting

### If Google Sign-In Still Doesn't Work:

1. **Check Android SHA-1 Fingerprint**:
   ```bash
   # Get debug keystore SHA-1
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
   - Add this SHA-1 to Google Console project

2. **Verify Backend OAuth Configuration**:
   - Ensure backend is using client ID: `203453576607-ivpb2s4r8lnlkfk3osb6m0jb1pgdjd1`
   - Check `/api/auth/google/verify` endpoint works

3. **Check Network Connectivity**:
   - Ensure mobile app can reach backend API
   - Test other API endpoints to verify connection

## Build Status
- ✅ Configuration updated
- 🔄 New development build in progress: `5809f5de-c939-4167-b838-6bd025b9d58a`
- ⏳ ETA: ~90 minutes (free tier queue)

## Google Console Configuration Required

### For Android App:
1. Add package name: `com.karaokehub.app`
2. Add debug SHA-1 fingerprint
3. Add production SHA-1 fingerprint (when ready)

### For iOS App:
1. Add bundle ID: `com.karaokehub.app`
2. Add URL scheme: `com.googleusercontent.apps.203453576607-ivpb2s4r8lnlkfk3osb6m0jb1pgdjd1`