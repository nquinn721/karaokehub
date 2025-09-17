#!/bin/bash

echo "🚀 KaraokeHub Development Build Setup"
echo "======================================"
echo ""

echo "Option 1: Direct Device Testing (Recommended)"
echo "1. Install Expo Go on your Android phone from Google Play Store"
echo "2. Make sure your phone and computer are on the same Wi-Fi network"
echo "3. Run the development server:"
echo "   cd D:/Projects/KaraokeHub/app"
echo "   npx expo start --dev-client"
echo "4. Scan the QR code with Expo Go app"
echo ""

echo "Option 2: Development Build Installation"
echo "1. Download a working development build APK"
echo "2. Install it on your phone (enable 'Install from unknown sources')"
echo "3. Run the development server and scan QR code"
echo ""

echo "Option 3: Web Testing (Current Working)"
echo "1. Run: npx expo start --web"
echo "2. Open http://localhost:8081 in your browser"
echo "3. Test all functionality except native map features"
echo ""

echo "📱 Current Status:"
echo "✅ Production API working: https://karaoke-hub.com/api"
echo "✅ Map placeholder ready for development builds"
echo "✅ All stores and navigation working"
echo "✅ Location services configured"
echo ""

echo "🗺️ Map Features:"
echo "- In Expo Go: Shows map placeholder with venue count"
echo "- In Development Build: Shows full interactive map with markers"
echo "- ConditionalMap automatically detects the environment"

echo ""
echo "To start development server, run:"
echo "npx expo start --dev-client"
