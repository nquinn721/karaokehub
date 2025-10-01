#!/bin/bash

# Google Cloud Maps API Security Audit and Migration Script
# This script checks your current configuration and helps migrate to secure keys

set -e

PROJECT_ID="heroic-footing-460117-k8"
CURRENT_SECRET="KARAOKE_HUB_GOOGLE_MAPS_API_KEY"

echo "🔍 Google Cloud Maps API Security Audit"
echo "======================================="
echo "Project ID: $PROJECT_ID"
echo ""

# Check current secret
echo "1. Checking Current Secret Configuration..."
echo "-------------------------------------------"

if gcloud secrets describe $CURRENT_SECRET --project=$PROJECT_ID &>/dev/null; then
    echo "✅ Current secret exists: $CURRENT_SECRET"
    
    # Get current key value (first few characters only for security)
    CURRENT_KEY=$(gcloud secrets versions access latest --secret=$CURRENT_SECRET --project=$PROJECT_ID)
    KEY_PREFIX=${CURRENT_KEY:0:10}
    echo "   Current key prefix: ${KEY_PREFIX}..."
    
    # Check key versions
    echo "   Versions available:"
    gcloud secrets versions list $CURRENT_SECRET --project=$PROJECT_ID --format="table(name,state,createTime)"
    
else
    echo "❌ Current secret not found: $CURRENT_SECRET"
    exit 1
fi

echo ""

# Check current Cloud Run configuration
echo "2. Checking Cloud Run Environment Configuration..."
echo "--------------------------------------------------"

echo "Current cloudrun-service.yaml configuration:"
grep -A 5 -B 2 "GOOGLE_MAPS_API_KEY" cloudrun-service.yaml || echo "   No Maps API key found in cloudrun-service.yaml"

echo ""

echo "Current cloudbuild.yaml configuration:"
grep "GOOGLE_MAPS_API_KEY" cloudbuild.yaml || echo "   No Maps API key found in cloudbuild.yaml"

echo ""

# Check what new secrets we need to create
echo "3. Checking Required New Secrets..."
echo "-----------------------------------"

NEW_SECRETS=(
    "KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY"
    "KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY" 
    "KARAOKE_HUB_GOOGLE_MAPS_ANDROID_KEY"
    "KARAOKE_HUB_GOOGLE_MAPS_STATIC_KEY"
)

for secret in "${NEW_SECRETS[@]}"; do
    if gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
        echo "✅ $secret already exists"
        gcloud secrets versions list $secret --project=$PROJECT_ID --limit=1 --format="value(name,state)"
    else
        echo "❌ $secret needs to be created"
    fi
done

echo ""

# Generate migration commands
echo "4. Migration Commands Needed..."
echo "-------------------------------"

echo "To create new restricted API keys in Google Cloud Console:"
echo "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo ""

echo "After creating new keys, run these commands to store them as secrets:"
echo ""

for secret in "${NEW_SECRETS[@]}"; do
    if ! gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
        cat << EOF
# Create $secret
echo -n "YOUR_NEW_${secret#KARAOKE_HUB_}_HERE" | gcloud secrets create $secret --data-file=- --project=$PROJECT_ID

EOF
    fi
done

echo "Update Cloud Run service with new secrets:"
cat << 'EOF'

# Add to cloudrun-service.yaml env section:
            - name: GOOGLE_MAPS_SERVER_API_KEY
              valueFrom:
                secretKeyRef:
                  name: KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY
                  key: latest
            - name: VITE_GOOGLE_MAPS_CLIENT_KEY
              valueFrom:
                secretKeyRef:
                  name: KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY
                  key: latest
EOF

echo ""

echo "Update cloudbuild.yaml secrets section:"
cat << 'EOF'

# Add to --update-secrets line:
,GOOGLE_MAPS_SERVER_API_KEY=KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY:latest,VITE_GOOGLE_MAPS_CLIENT_KEY=KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY:latest,GOOGLE_MAPS_ANDROID_KEY=KARAOKE_HUB_GOOGLE_MAPS_ANDROID_KEY:latest,GOOGLE_MAPS_STATIC_KEY=KARAOKE_HUB_GOOGLE_MAPS_STATIC_KEY:latest
EOF

echo ""

# Security recommendations
echo "5. Security Recommendations..."
echo "------------------------------"

cat << 'EOF'
🔐 API Key Restrictions (Configure in Google Cloud Console):

1. Server Key (KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY):
   - Application restrictions: IP addresses
   - Add your Cloud Run service IPs
   - Add 127.0.0.1 for local development
   - API restrictions: Geocoding API, Distance Matrix API

2. Client Key (KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY):
   - Application restrictions: HTTP referrers
   - Add: https://karaoke-hub.com/*
   - Add: http://localhost:*/* (for development)
   - API restrictions: Maps JavaScript API

3. Android Key (KARAOKE_HUB_GOOGLE_MAPS_ANDROID_KEY):
   - Application restrictions: Android apps
   - Package name: com.karaokehub.app
   - SHA-1: Your app certificate fingerprint
   - API restrictions: Maps SDK for Android

4. Static Key (KARAOKE_HUB_GOOGLE_MAPS_STATIC_KEY):
   - Application restrictions: None (use signatures)
   - API restrictions: Maps Static API
   - Implement digital signatures for requests
EOF

echo ""

echo "6. Current API Key Analysis..."
echo "------------------------------"

# Try to determine if current key is unrestricted (this is informational only)
echo "⚠️  Your current API key (${KEY_PREFIX}...) may be the unrestricted key mentioned in Google's email."
echo "   To verify this is the problematic key:"
echo "   1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "   2. Look for key with ID: 9244b43b-56fa-4889-801e-2eb4c05c80f9"
echo "   3. Check if it matches your current secret value"
echo ""

echo "📋 Next Steps:"
echo "1. Create 4 new restricted API keys in Google Cloud Console"
echo "2. Store them as secrets using the commands above"  
echo "3. Update cloudrun-service.yaml and cloudbuild.yaml"
echo "4. Deploy and test the new configuration"
echo "5. Disable the old unrestricted key"
echo ""

echo "🚨 URGENT: Complete this within 24-48 hours to avoid billing issues!"