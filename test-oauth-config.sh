#!/bin/bash

echo "🔍 Testing Google OAuth Configuration"
echo "===================================="

echo ""
echo "Current Environment:"
echo "- Backend PORT: $(grep ^PORT= .env || echo 'Not set')"
echo "- Backend URL: $(grep ^BACKEND_URL= .env || echo 'Not set')"

echo ""
echo "Testing OAuth endpoints:"
echo "1. Testing Google OAuth initiation..."
curl -I "http://localhost:8000/api/auth/google" 2>/dev/null | head -1

echo ""
echo "2. Expected callback URL that should be in Google Console:"
echo "   http://localhost:8000/api/auth/google/callback"

echo ""
echo "🔧 If you're getting redirect URI mismatch:"
echo "1. Go to https://console.cloud.google.com/"
echo "2. APIs & Services > Credentials"
echo "3. Edit your OAuth 2.0 Client ID"
echo "4. Add to 'Authorized redirect URIs':"
echo "   - http://localhost:8000/api/auth/google/callback"
echo "   - https://karaokehub-203453576607.us-central1.run.app/api/auth/google/callback"
echo "5. Save and wait 5-10 minutes"

echo ""
echo "📋 Full Google Cloud Console Configuration Needed:"
echo ""
echo "Authorized JavaScript origins:"
echo "- http://localhost:3000"
echo "- http://localhost:8000"
echo "- https://karaoke-hub.com"
echo "- https://karaokehub-203453576607.us-central1.run.app"
echo ""
echo "Authorized redirect URIs:"
echo "- http://localhost:8000/api/auth/google/callback"
echo "- https://karaokehub-203453576607.us-central1.run.app/api/auth/google/callback"
echo "- https://karaoke-hub.com/api/auth/google/callback"
