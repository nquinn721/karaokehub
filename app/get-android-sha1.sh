#!/bin/bash

# Get Android Debug SHA-1 Fingerprint for Google Console
echo "🔐 Getting Android Debug SHA-1 Fingerprint..."
echo ""

cd "$(dirname "$0")"

# Check if debug keystore exists
if [ -f "android/app/debug.keystore" ]; then
    echo "Found debug keystore at: android/app/debug.keystore"
    echo ""
    
    # Get SHA-1 fingerprint
    echo "SHA-1 Fingerprint:"
    keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
    
    echo ""
    echo "📋 Copy the SHA-1 fingerprint above and add it to your Google Console project:"
    echo "   1. Go to Google Cloud Console"
    echo "   2. Select your project"
    echo "   3. Go to APIs & Services > Credentials"
    echo "   4. Find your OAuth 2.0 Client ID for Android"
    echo "   5. Add the SHA-1 fingerprint above"
    echo ""
    echo "Package name should be: com.karaokehub.app"
    
else
    echo "❌ Debug keystore not found at android/app/debug.keystore"
    echo "Try running a development build first:"
    echo "   npx expo run:android"
fi