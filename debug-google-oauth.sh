#!/bin/bash

echo "🔍 Google OAuth Debug Information"
echo "=================================="

echo ""
echo "📋 Current Configuration:"
echo "- Client ID: 203453576607-qnjhb8tvf0pp8629bvpq9lbrg6mq.apps.googleusercontent.com"
echo "- Generated OAuth URL: https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=https%3A%2F%2Fkaraoke-hub.com%2Fapi%2Fauth%2Fgoogle%2Fcallback&scope=email%20profile&client_id=203453576607-qnjhb8tvf0pp8629bvpq9lbrg6mq.apps.googleusercontent.com"
echo "- Callback URL: https://karaoke-hub.com/api/auth/google/callback"

echo ""
echo "🔐 Secret Versions:"
gcloud secrets versions list KARAOKE_HUB_GOOGLE_CLIENT_SECRET --limit=3

echo ""
echo "🚀 Current Deployment:"
gcloud run revisions list --service=karaokehub --region=us-central1 --limit=1

echo ""
echo "📊 Testing OAuth Initiation:"
curl -s -I "https://karaoke-hub.com/api/auth/google" | grep -E "(HTTP|location)"

echo ""
echo "🔍 Required Google Cloud Console Configuration:"
echo ""
echo "Authorized redirect URIs (must include exactly):"
echo "- https://karaoke-hub.com/api/auth/google/callback"
echo "- https://karaokehub-203453576607.us-central1.run.app/api/auth/google/callback"
echo "- http://localhost:8000/api/auth/google/callback"
echo ""
echo "Authorized JavaScript origins (must include exactly):"
echo "- https://karaoke-hub.com"
echo "- https://karaokehub-203453576607.us-central1.run.app"
echo "- http://localhost:5173"
echo "- http://localhost:8000"

echo ""
echo "⚡ Next Steps:"
echo "1. Verify Google Cloud Console OAuth client has ALL the above redirect URIs"
echo "2. If still failing, generate a NEW client secret in Google Cloud Console"
echo "3. Update the secret with: ./update-google-oauth-secrets.sh"
echo "4. Deploy: gcloud run deploy karaokehub --source . --region us-central1 --allow-unauthenticated"
echo "5. Test: https://karaoke-hub.com (try Google login)"
