#!/bin/bash

# Secure Google Maps API Keys Script
# This script helps you create properly restricted API keys for different use cases

echo "🔒 Securing Google Maps API Keys for KaraokeHub"
echo "================================================"

# Project details
PROJECT_ID="heroic-footing-460117-k8"
CURRENT_KEY_NAME="Maps Platform API Key"

echo "Current Issues to Fix:"
echo "❌ Single unrestricted API key used across multiple platforms"
echo "❌ Key exposed in client-side code (potential security risk)"
echo "❌ Unsigned Maps Static API requests"
echo ""

echo "Creating New Restricted API Keys..."
echo "=================================="

# 1. Backend/Server API Key (IP-restricted for server use)
echo "1. Creating Backend API Key (for Geocoding & Distance Matrix APIs)..."
gcloud services enable apikeys.googleapis.com --project=$PROJECT_ID

# Get your Cloud Run service IP (you'll need to replace this with actual IPs)
echo "   Note: You'll need to restrict this key to your Cloud Run service IPs"
echo "   Current server endpoints that need access:"
echo "   - Your Cloud Run service"
echo "   - Local development (127.0.0.1)"
echo ""

# 2. Web Client API Key (HTTP referrer-restricted)
echo "2. Creating Web Client API Key (for Maps JavaScript API)..."
echo "   This should be restricted to your web domains:"
echo "   - https://karaokehub.com/*"
echo "   - https://*.karaokehub.com/*"
echo "   - http://localhost:*/* (for development)"
echo ""

# 3. Android API Key (Android app-restricted)
echo "3. Creating Android API Key (for mobile app)..."
echo "   This should be restricted to your Android app package name and SHA-1"
echo "   Package: com.karaokehub.app (or your actual package name)"
echo ""

# 4. Static Maps API Key (with digital signatures)
echo "4. Creating Static Maps API Key (signed requests only)..."
echo "   This requires implementing digital signatures for Maps Static API"
echo ""

echo "Manual Steps Required in Google Cloud Console:"
echo "============================================="
echo "1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo ""
echo "2. Create 4 NEW API Keys with these restrictions:"
echo ""
echo "🔑 Backend Server Key:"
echo "   - Name: KaraokeHub-Backend-Server"
echo "   - Application restrictions: IP addresses"
echo "   - IP addresses: [Your Cloud Run IPs, 127.0.0.1]"
echo "   - API restrictions: Geocoding API, Distance Matrix API"
echo ""
echo "🔑 Web Client Key:"
echo "   - Name: KaraokeHub-Web-Client"
echo "   - Application restrictions: HTTP referrers (web sites)"
echo "   - Website restrictions: https://karaokehub.com/*, http://localhost:*/*"
echo "   - API restrictions: Maps JavaScript API, Places API (Web)"
echo ""
echo "🔑 Android Mobile Key:"
echo "   - Name: KaraokeHub-Android"
echo "   - Application restrictions: Android apps"
echo "   - Package name: com.karaokehub.app"
echo "   - SHA-1: [Your app's SHA-1 fingerprint]"
echo "   - API restrictions: Maps SDK for Android"
echo ""
echo "🔑 Static Maps Key:"
echo "   - Name: KaraokeHub-Static-Maps"
echo "   - Application restrictions: None (will use digital signatures)"
echo "   - API restrictions: Maps Static API"
echo ""

echo "3. Update your environment variables:"
echo "   - GOOGLE_MAPS_SERVER_API_KEY (backend server key)"
echo "   - VITE_GOOGLE_MAPS_CLIENT_KEY (web client key)"
echo "   - GOOGLE_MAPS_ANDROID_KEY (mobile app key)"
echo "   - GOOGLE_MAPS_STATIC_KEY (static maps key)"
echo ""

echo "4. DISABLE or DELETE the old unrestricted key after testing"
echo ""

echo "Environment Variable Updates Needed:"
echo "=================================="
cat << EOF

# .env updates
GOOGLE_MAPS_SERVER_API_KEY=your_new_server_key_here
VITE_GOOGLE_MAPS_CLIENT_KEY=your_new_client_key_here
GOOGLE_MAPS_ANDROID_KEY=your_new_android_key_here
GOOGLE_MAPS_STATIC_KEY=your_new_static_key_here

# Google Cloud Secrets to create:
gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY --data-file=-
gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY --data-file=-
gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_ANDROID_KEY --data-file=-
gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_STATIC_KEY --data-file=-

EOF

echo ""
echo "⚠️  CRITICAL: Complete these steps within 24-48 hours to avoid potential billing issues!"
echo "📞 Need help? Contact Google Maps Platform Support: https://cloud.google.com/maps-platform/support"