#!/bin/bash

# Create Spotify secrets for production music integration
echo "🎵 Creating Spotify secrets in Google Secret Manager..."

# Spotify API credentials (replace with your actual credentials)
echo "Creating Spotify Client ID secret..."
echo -n "YOUR_SPOTIFY_CLIENT_ID" | gcloud secrets create KARAOKE_HUB_SPOTIFY_CLIENT_ID --data-file=-

echo "Creating Spotify Client Secret..."
echo -n "YOUR_SPOTIFY_CLIENT_SECRET" | gcloud secrets create KARAOKE_HUB_SPOTIFY_CLIENT_SECRET --data-file=-

echo "✅ Spotify secrets created successfully!"
echo "🔗 Remember to:"
echo "   1. Replace YOUR_SPOTIFY_CLIENT_ID with your actual Spotify Client ID"
echo "   2. Replace YOUR_SPOTIFY_CLIENT_SECRET with your actual Spotify Client Secret"
echo "   3. Grant Cloud Run service account access to these secrets"
echo "   4. Update cloudrun-service.yaml to include these environment variables"
echo ""
echo "📝 To get Spotify credentials:"
echo "   1. Go to https://developer.spotify.com/dashboard"
echo "   2. Create a new app"
echo "   3. Copy the Client ID and Client Secret"
