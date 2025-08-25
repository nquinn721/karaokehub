#!/bin/bash

# Setup Facebook Cookies for Cloud Run Deployment
# This script converts your local Facebook cookies to an environment variable format
# and sets it as a secret in Google Secret Manager for Cloud Run

echo "🍪 Setting up Facebook session cookies for Cloud Run deployment..."

# Check if facebook-cookies.json exists
if [ ! -f "data/facebook-cookies.json" ]; then
    echo "❌ Error: data/facebook-cookies.json not found"
    echo "Please ensure you have Facebook session cookies saved locally first"
    exit 1
fi

# Convert cookies to single-line JSON (environment variable format)
echo "📦 Converting cookies to environment variable format..."
COOKIES_JSON=$(cat data/facebook-cookies.json | jq -c .)

# Check if jq command worked
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to process cookies with jq. Please install jq or check your cookies file"
    exit 1
fi

# Create/update the secret in Google Secret Manager
echo "🔐 Storing Facebook cookies in Google Secret Manager..."
echo "$COOKIES_JSON" | gcloud secrets create fb-session-cookies \
    --data-file=- \
    --replication-policy="automatic" || \
echo "$COOKIES_JSON" | gcloud secrets versions add fb-session-cookies \
    --data-file=-

if [ $? -eq 0 ]; then
    echo "✅ Facebook session cookies stored in Google Secret Manager"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update your cloudbuild.yaml to mount the secret as FB_SESSION_COOKIES"
    echo "2. Update your cloudrun-service.yaml to include the environment variable"
    echo ""
    echo "Add this to your Cloud Run service configuration:"
    echo "  env:"
    echo "  - name: FB_SESSION_COOKIES"
    echo "    valueFrom:"
    echo "      secretKeyRef:"
    echo "        name: fb-session-cookies"
    echo "        key: latest"
else
    echo "❌ Failed to store cookies in Google Secret Manager"
    exit 1
fi

echo ""
echo "🚀 Facebook cookies are now ready for Cloud Run deployment!"
echo "Your application will automatically use these cookies in production."
