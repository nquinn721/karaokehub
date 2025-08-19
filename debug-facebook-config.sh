#!/bin/bash

# Facebook App Configuration Debug Script
echo "🔍 Facebook OAuth Configuration Debug"
echo "======================================"

# Check environment variables
echo ""
echo "📋 Current Environment Variables:"
echo "FACEBOOK_APP_ID: $FACEBOOK_APP_ID"
echo "FACEBOOK_APP_SECRET: ${FACEBOOK_APP_SECRET:0:8}..." # Only show first 8 chars
echo "NODE_ENV: $NODE_ENV"
echo "BACKEND_URL: $BACKEND_URL"
echo ""

# Show what URLs should be configured in Facebook
echo "🔗 URLs that MUST be configured in your Facebook App:"
echo ""
echo "1. App Domains (Basic Settings):"
echo "   ✓ localhost"
echo "   ✓ karaoke-hub.com"
echo ""
echo "2. Valid OAuth Redirect URIs (Facebook Login Settings):"
echo "   ✓ http://localhost:8000/api/auth/facebook/callback"
echo "   ✓ https://karaoke-hub.com/api/auth/facebook/callback"
echo ""
echo "3. Site URL (Facebook Login Settings):"
echo "   ✓ http://localhost:8000"
echo ""

# Test the OAuth endpoint
echo "🧪 Testing Facebook OAuth endpoint..."
curl -I http://localhost:8000/api/auth/facebook 2>/dev/null | grep -E "(HTTP|Location)" || echo "❌ Backend not running or OAuth endpoint unavailable"

echo ""
echo "🎯 Next Steps:"
echo "1. Go to https://developers.facebook.com/apps"
echo "2. Select your app (ID: $FACEBOOK_APP_ID)"
echo "3. Go to 'Settings' → 'Basic'"
echo "4. Add 'localhost' to 'App Domains'"
echo "5. Go to 'Facebook Login' → 'Settings'"
echo "6. Add the redirect URIs listed above"
echo "7. Save changes and test again"
echo ""
echo "📱 Facebook App Direct Link:"
echo "https://developers.facebook.com/apps/$FACEBOOK_APP_ID/settings/basic/"
