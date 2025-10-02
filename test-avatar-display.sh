#!/bin/bash
# Test script for avatar and microphone display

echo "🎤 KaraokeHub Test Script - Avatar & Microphone Display"
echo "======================================================"

# 1. Check if server is running
echo "1. Checking server status..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Server is running"
else 
    echo "❌ Server is not running. Please start it with: npm run start:dev"
    exit 1
fi

# 2. Get active shows
echo ""
echo "2. Getting active shows..."
SHOWS_RESPONSE=$(curl -s -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    http://localhost:3001/api/live-shows)
echo "Shows response: $SHOWS_RESPONSE"

# 3. Instructions for manual testing
echo ""
echo "3. Manual Testing Steps:"
echo "----------------------"
echo "a) Login to the app as NateDogg"
echo "b) Navigate to live shows" 
echo "c) Create a test show or join existing one"
echo "d) The avatar should show as 'Rock Star Avatar' with /images/avatar/avatar_7.png"
echo "e) The microphone should show as 'Gold Pro Mic' with /images/avatar/parts/microphones/mic_gold_1.png"

echo ""
echo "4. Backend Changes Made:"
echo "----------------------"
echo "✅ Removed database relation dependencies (equippedAvatar, equippedMicrophone)"
echo "✅ Added test mode avatar/microphone assignment for NateDogg"
echo "✅ Created /join-test endpoint that bypasses location validation"
echo "✅ Updated avatar and microphone mappings to match test data"

echo ""
echo "5. Frontend Avatar Display:"
echo "-------------------------"
echo "The CurrentSingerDisplay component will show:"
echo "- 200px avatar image (large and prominent)"
echo "- 120px microphone image" 
echo "- Animated spotlight effects"
echo "- Stage-like presentation"

echo ""
echo "🎯 If avatars still show as fallback text, check:"
echo "  - Browser console for image loading errors"
echo "  - Server logs for backend avatar retrieval"
echo "  - Network tab to see if API calls are working"

echo ""
echo "Test complete! 🎤✨"