#!/bin/bash
# Script to build development version for testing native features

echo "🚀 Building development version with EAS..."
echo "This build will include react-native-maps and other native modules."

# Build for Android development
npx eas build --platform android --profile development --local

echo "✅ Development build complete!"
echo "Install the APK on your device and scan the QR code to test the app."
