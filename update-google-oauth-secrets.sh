#!/bin/bash

# Update Google OAuth secrets for KaraokeHub
echo "🔐 Updating Google OAuth secrets in Google Secret Manager..."

# Check if secrets already exist and update them
echo "Updating Google Client ID secret..."
if gcloud secrets describe KARAOKE_HUB_GOOGLE_CLIENT_ID >/dev/null 2>&1; then
    echo -n "203453576607-qnjhb8tvf0pp8629bvpq9lbrg6mq.apps.googleusercontent.com" | gcloud secrets versions add KARAOKE_HUB_GOOGLE_CLIENT_ID --data-file=-
    echo "✅ Google Client ID secret updated"
else
    echo -n "203453576607-qnjhb8tvf0pp8629bvpq9lbrg6mq.apps.googleusercontent.com" | gcloud secrets create KARAOKE_HUB_GOOGLE_CLIENT_ID --data-file=-
    echo "✅ Google Client ID secret created"
fi

echo "Updating Google Client Secret..."
if gcloud secrets describe KARAOKE_HUB_GOOGLE_CLIENT_SECRET >/dev/null 2>&1; then
    echo -n "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" | gcloud secrets versions add KARAOKE_HUB_GOOGLE_CLIENT_SECRET --data-file=-
    echo "✅ Google Client Secret updated"
else
    echo -n "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" | gcloud secrets create KARAOKE_HUB_GOOGLE_CLIENT_SECRET --data-file=-
    echo "✅ Google Client Secret created"
fi

# Grant service account access to the secrets
echo "🔐 Granting service account access to OAuth secrets..."

SERVICE_ACCOUNT="203453576607-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_CLIENT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_CLIENT_SECRET \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"

echo "✅ Google OAuth secrets configured successfully!"
echo ""
echo "🚀 Next steps:"
echo "   1. Update Google Cloud Console OAuth redirect URIs:"
echo "      - https://karaoke-hub.com/api/auth/google/callback"
echo "      - http://localhost:8000/api/auth/google/callback (for development)"
echo ""
echo "   2. Redeploy your Cloud Run service:"
echo "      gcloud run deploy karaokehub --source . --region us-central1 --allow-unauthenticated"
echo ""
echo "   3. Test OAuth login at:"
echo "      https://karaoke-hub.com/login"
