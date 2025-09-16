#!/bin/bash

# Development Setup Script for HMR
# This script ensures Hot Module Replacement works properly

echo "🔥 Setting up Hot Module Replacement (HMR) for KaraokeHub mobile app..."

# Check if we're in the app directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the app directory"
    exit 1
fi

# Clear any existing Metro cache
echo "🧹 Clearing Metro cache..."
npx expo start --clear &
sleep 3
pkill -f "expo start" 2>/dev/null || true

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Clear Expo cache
echo "🧹 Clearing Expo cache..."
npx expo install --fix

echo "✅ Cache cleared!"

# Start development server with HMR
echo "🚀 Starting development server with HMR enabled..."
echo ""
echo "📱 For best HMR experience:"
echo "   1. Use a development build (not Expo Go)"
echo "   2. Connect to the same WiFi network"
echo "   3. Enable 'Fast Refresh' in the development menu"
echo ""
echo "🔥 Hot reloading will work for:"
echo "   - Component changes"
echo "   - Style updates"
echo "   - State changes"
echo "   - New imports (may require manual reload)"
echo ""

npx expo start --dev-client --clear
