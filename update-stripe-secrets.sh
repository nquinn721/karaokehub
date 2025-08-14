#!/bin/bash

# Update Stripe secrets in Google Secret Manager
echo "🔐 Updating Stripe secrets in Google Secret Manager..."

# Check if all required arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <stripe_secret_key> <stripe_publishable_key> <stripe_webhook_secret>"
    echo "Example: $0 sk_test_51ABC... pk_test_51ABC... whsec_ABC..."
    exit 1
fi

STRIPE_SECRET_KEY="$1"
STRIPE_PUBLISHABLE_KEY="$2"
STRIPE_WEBHOOK_SECRET="$3"

echo "Updating Stripe Secret Key..."
echo -n "$STRIPE_SECRET_KEY" | gcloud secrets versions add KARAOKE_HUB_STRIPE_SECRET_KEY --data-file=-

echo "Updating Stripe Publishable Key..."
echo -n "$STRIPE_PUBLISHABLE_KEY" | gcloud secrets versions add KARAOKE_HUB_STRIPE_PUBLISHABLE_KEY --data-file=-

echo "Updating Stripe Webhook Secret..."
echo -n "$STRIPE_WEBHOOK_SECRET" | gcloud secrets versions add KARAOKE_HUB_STRIPE_WEBHOOK_SECRET --data-file=-

echo "✅ Stripe secrets updated successfully!"
echo ""
echo "🚀 To deploy these changes to Cloud Run:"
echo "   ./deploy.sh"
echo ""
echo "📋 Next steps:"
echo "   1. Create your Stripe products and prices in Stripe Dashboard"
echo "   2. Update STRIPE_AD_FREE_PRICE_ID and STRIPE_PREMIUM_PRICE_ID in cloudrun-service.yaml"
echo "   3. Set up webhook endpoint: https://your-app-url/api/subscription/webhook"
echo "   4. Test your payment integration"
