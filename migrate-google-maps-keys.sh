#!/bin/bash

# Google Maps API Key Migration Script - Step by Step
# Run this after creating new restricted API keys in Google Cloud Console

set -e

PROJECT_ID="heroic-footing-460117-k8"

echo "🔐 Google Maps API Key Migration for KaraokeHub"
echo "==============================================="
echo ""

echo "Prerequisites:"
echo "1. You must have created 4 new restricted API keys in Google Cloud Console"
echo "2. Each key should be properly restricted as per the documentation"
echo "3. You should have the new API key values ready"
echo ""

read -p "Have you created the 4 new restricted API keys? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please create the new API keys first:"
    echo "   Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
    echo "   Follow the restrictions in docs/GOOGLE-MAPS-SECURITY-MIGRATION.md"
    exit 1
fi

echo ""
echo "Step 1: Create Google Cloud Secrets"
echo "===================================="

echo ""
echo "🔑 Creating Server API Key Secret..."
echo "This key should be restricted to IP addresses (your Cloud Run service + 127.0.0.1)"
echo -n "Enter your SERVER API key: "
read -s SERVER_KEY
echo
echo -n "$SERVER_KEY" | gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY --data-file=- --project=$PROJECT_ID
echo "✅ Server key stored as KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY"

echo ""
echo "🌐 Creating Client API Key Secret..."
echo "This key should be restricted to HTTP referrers (your website domains)"
echo -n "Enter your CLIENT API key: "
read -s CLIENT_KEY
echo
echo -n "$CLIENT_KEY" | gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY --data-file=- --project=$PROJECT_ID
echo "✅ Client key stored as KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY"

echo ""
echo "📱 Creating Android API Key Secret..."
echo "This key should be restricted to Android apps (package name + SHA-1)"
echo -n "Enter your ANDROID API key: "
read -s ANDROID_KEY
echo
echo -n "$ANDROID_KEY" | gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_ANDROID_KEY --data-file=- --project=$PROJECT_ID
echo "✅ Android key stored as KARAOKE_HUB_GOOGLE_MAPS_ANDROID_KEY"

echo ""
echo "🗺️  Creating Static Maps API Key Secret..."
echo "This key should use digital signatures for Maps Static API"
echo -n "Enter your STATIC MAPS API key: "
read -s STATIC_KEY
echo
echo -n "$STATIC_KEY" | gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_STATIC_KEY --data-file=- --project=$PROJECT_ID
echo "✅ Static Maps key stored as KARAOKE_HUB_GOOGLE_MAPS_STATIC_KEY"

echo ""
echo "Step 2: Grant Cloud Run Service Access to New Secrets"
echo "====================================================="

CLOUD_RUN_SA="203453576607-compute@developer.gserviceaccount.com"

echo "Granting access to Cloud Run service account: $CLOUD_RUN_SA"

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY \
    --member="serviceAccount:$CLOUD_RUN_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY \
    --member="serviceAccount:$CLOUD_RUN_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_MAPS_ANDROID_KEY \
    --member="serviceAccount:$CLOUD_RUN_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_MAPS_STATIC_KEY \
    --member="serviceAccount:$CLOUD_RUN_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

echo "✅ All IAM permissions granted"

echo ""
echo "Step 3: Verify Configuration Files"
echo "=================================="

echo "Checking cloudrun-service.yaml..."
if grep -q "GOOGLE_MAPS_SERVER_API_KEY" cloudrun-service.yaml; then
    echo "✅ cloudrun-service.yaml updated with new keys"
else
    echo "❌ cloudrun-service.yaml needs manual update - see the migration guide"
fi

echo "Checking cloudbuild.yaml..."
if grep -q "GOOGLE_MAPS_SERVER_API_KEY" cloudbuild.yaml; then
    echo "✅ cloudbuild.yaml updated with new keys"
else
    echo "❌ cloudbuild.yaml needs manual update - see the migration guide"
fi

echo ""
echo "Step 4: Deploy and Test"
echo "======================="

read -p "Deploy the updated service now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying updated service..."
    
    # Trigger Cloud Build deployment
    gcloud builds submit --config cloudbuild.yaml . --project=$PROJECT_ID
    
    echo "✅ Deployment initiated"
    echo ""
    echo "Monitor deployment:"
    echo "https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
else
    echo "⏭️  Skipping deployment - run manually when ready"
fi

echo ""
echo "Step 5: Verification Checklist"
echo "==============================="

cat << 'EOF'
After deployment, verify these work:
□ Backend geocoding (venue address lookup)
□ Distance calculations between locations  
□ Web client maps (if implemented)
□ Mobile app maps (if implemented)

Test commands:
# Test geocoding endpoint
curl "https://karaoke-hub.com/api/geocoding/address?q=1600+Amphitheatre+Parkway,+Mountain+View,+CA"

# Test venue search with location
curl "https://karaoke-hub.com/api/venues?lat=37.4221&lng=-122.0841&radius=10"
EOF

echo ""
echo "Step 6: Disable Old Key (AFTER TESTING)"
echo "========================================"

cat << EOF
⚠️  IMPORTANT: Only do this AFTER confirming everything works!

1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID
2. Find your old unrestricted API key (starts with AIzaSyCJgu...)
3. Click "Disable" (don't delete yet)
4. Monitor for 24-48 hours
5. If no issues, delete the old key permanently

Current old key in secret: KARAOKE_HUB_GOOGLE_MAPS_API_KEY
This secret can be deleted after migration is complete.
EOF

echo ""
echo "🎉 Migration Complete!"
echo "====================="
echo ""
echo "Summary of what was created:"
echo "- 4 new restricted Google Cloud secrets"
echo "- Updated Cloud Run and Cloud Build configurations"
echo "- Proper IAM permissions for service access"
echo ""
echo "Next steps:"
echo "1. Test all functionality thoroughly"
echo "2. Monitor for any API errors in logs"
echo "3. Disable old unrestricted key after 24-48 hours"
echo "4. Update local development .env with new keys"
echo ""
echo "📊 Monitor usage: https://console.cloud.google.com/apis/api/maps-backend.googleapis.com/quotas?project=$PROJECT_ID"
echo "🔒 Manage keys: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"