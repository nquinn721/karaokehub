#!/bin/bash

# Create secrets for KaraokeHub deployment
echo "🔐 Creating secrets in Google Secret Manager..."

# Database credentials
echo "Creating database username secret..."
echo -n "KaraokeHubUser" | gcloud secrets create KARAOKE_HUB_DB_USERNAME --data-file=-

echo "Creating database password secret..."
echo -n ",ELTMV]@?KOSUTOn" | gcloud secrets create KARAOKE_HUB_DB_PASSWORD --data-file=-

# JWT Secret (generate a secure random string)
echo "Creating JWT secret..."
JWT_SECRET=$(openssl rand -base64 64)
echo -n "$JWT_SECRET" | gcloud secrets create KARAOKE_HUB_JWT_SECRET --data-file=-

# Google OAuth (you'll need to set these manually)
echo "Creating Google OAuth secrets (empty - set these manually)..."
echo -n "YOUR_GOOGLE_CLIENT_ID" | gcloud secrets create KARAOKE_HUB_GOOGLE_CLIENT_ID --data-file=-
echo -n "YOUR_GOOGLE_CLIENT_SECRET" | gcloud secrets create KARAOKE_HUB_GOOGLE_CLIENT_SECRET --data-file=-

# Gemini API Key (replace with your actual key)
echo "Creating Gemini API key secret..."
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create KARAOKE_HUB_GEMINI_API_KEY --data-file=-

echo "✅ Secrets created successfully!"
echo "🔗 Remember to:"
echo "   1. Update Google OAuth secrets with your actual credentials"
echo "   2. Grant Cloud Run service account access to secrets"
