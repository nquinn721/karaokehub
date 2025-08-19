#!/bin/bash

# Create Facebook OAuth secrets for KaraokeHub deployment
echo "🔐 Creating Facebook OAuth secrets in Google Secret Manager..."

# Check if secrets already exist
if gcloud secrets describe KARAOKE_HUB_FACEBOOK_APP_ID &>/dev/null; then
    echo "📝 Updating existing Facebook App ID secret..."
    echo -n "646464114624794" | gcloud secrets versions add KARAOKE_HUB_FACEBOOK_APP_ID --data-file=-
else
    echo "📝 Creating Facebook App ID secret..."
    echo -n "646464114624794" | gcloud secrets create KARAOKE_HUB_FACEBOOK_APP_ID --data-file=-
fi

if gcloud secrets describe KARAOKE_HUB_FACEBOOK_APP_SECRET &>/dev/null; then
    echo "📝 Updating existing Facebook App Secret secret..."
    echo -n "3ce6645105081d6f3a5442a30bd6b1ae" | gcloud secrets versions add KARAOKE_HUB_FACEBOOK_APP_SECRET --data-file=-
else
    echo "📝 Creating Facebook App Secret secret..."
    echo -n "3ce6645105081d6f3a5442a30bd6b1ae" | gcloud secrets create KARAOKE_HUB_FACEBOOK_APP_SECRET --data-file=-
fi

echo "✅ Facebook OAuth secrets created/updated successfully!"
echo "🔗 Next steps:"
echo "   1. Update cloudrun-service.yaml to use secrets instead of hardcoded values"
echo "   2. Deploy the updated configuration"
echo "   3. Verify Facebook OAuth is working in production"
