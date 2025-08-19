#!/bin/bash

# Create Facebook OAuth secrets for KaraokeHub deployment
echo "🔐 Creating Facebook OAuth secrets in Google Secret Manager..."

# Main Facebook App (for user authentication)
echo "📱 Setting up Auth App secrets..."
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

# Facebook Parser App (for content parsing)
echo "🔍 Setting up Parser App secrets..."
if gcloud secrets describe KARAOKE_HUB_FACEBOOK_PARSER_APP_ID &>/dev/null; then
    echo "📝 Updating existing Facebook Parser App ID secret..."
    echo -n "1160707802576346" | gcloud secrets versions add KARAOKE_HUB_FACEBOOK_PARSER_APP_ID --data-file=-
else
    echo "📝 Creating Facebook Parser App ID secret..."
    echo -n "1160707802576346" | gcloud secrets create KARAOKE_HUB_FACEBOOK_PARSER_APP_ID --data-file=-
fi

if gcloud secrets describe KARAOKE_HUB_FACEBOOK_PARSER_APP_SECRET &>/dev/null; then
    echo "📝 Updating existing Facebook Parser App Secret secret..."
    echo -n "47f729de53981816dcce9b8776449b4b" | gcloud secrets versions add KARAOKE_HUB_FACEBOOK_PARSER_APP_SECRET --data-file=-
else
    echo "📝 Creating Facebook Parser App Secret secret..."
    echo -n "47f729de53981816dcce9b8776449b4b" | gcloud secrets create KARAOKE_HUB_FACEBOOK_PARSER_APP_SECRET --data-file=-
fi

echo "✅ Facebook OAuth secrets created/updated successfully!"
echo "🔗 Next steps:"
echo "   1. Update cloudrun-service.yaml to use all Facebook secrets"
echo "   2. Deploy the updated configuration"
echo "   3. Test both apps in production"
