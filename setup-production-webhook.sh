#!/bin/bash

# Production Webhook Setup for KaraokeHub
# This script helps set up webhooks for production deployment

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 KaraokeHub Production Webhook Setup${NC}"
echo "=============================================="

# Get the production URL
read -p "Enter your production URL (e.g., https://karaokehub-123.us-central1.run.app): " PROD_URL

if [[ -z "$PROD_URL" ]]; then
    echo -e "${RED}❌ Production URL is required${NC}"
    exit 1
fi

# Validate URL format
if [[ ! "$PROD_URL" =~ ^https:// ]]; then
    echo -e "${RED}❌ Production URL must use HTTPS${NC}"
    exit 1
fi

WEBHOOK_URL="$PROD_URL/api/subscription/webhook"

echo ""
echo -e "${YELLOW}📋 Production Webhook Configuration:${NC}"
echo "   Endpoint URL: $WEBHOOK_URL"
echo ""

# Check if Stripe CLI is available
if command -v stripe &> /dev/null; then
    echo -e "${GREEN}✅ Stripe CLI detected${NC}"
    
    # Offer to create webhook via CLI
    read -p "Create webhook endpoint via Stripe CLI? (y/n): " CREATE_WEBHOOK
    
    if [[ "$CREATE_WEBHOOK" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🔧 Creating webhook endpoint...${NC}"
        
        WEBHOOK_ID=$(stripe webhook-endpoints create \
            --url="$WEBHOOK_URL" \
            --enabled-events="customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed,customer.subscription.trial_will_end" \
            --description="KaraokeHub Production Webhooks" \
            --format=json | jq -r '.id')
        
        if [[ "$WEBHOOK_ID" != "null" && "$WEBHOOK_ID" != "" ]]; then
            echo -e "${GREEN}✅ Webhook endpoint created: $WEBHOOK_ID${NC}"
            
            # Get the webhook secret
            WEBHOOK_SECRET=$(stripe webhook-endpoints retrieve "$WEBHOOK_ID" --format=json | jq -r '.secret')
            
            echo ""
            echo -e "${YELLOW}🔐 Webhook Secret (save this securely):${NC}"
            echo "$WEBHOOK_SECRET"
            
            # Offer to update Google Cloud Secret
            read -p "Update Google Cloud Secret? (y/n): " UPDATE_CLOUD
            
            if [[ "$UPDATE_CLOUD" =~ ^[Yy]$ ]]; then
                echo -e "${BLUE}☁️  Updating Google Cloud Secret...${NC}"
                echo -n "$WEBHOOK_SECRET" | gcloud secrets versions add KARAOKE_HUB_STRIPE_WEBHOOK_SECRET --data-file=-
                echo -e "${GREEN}✅ Google Cloud Secret updated${NC}"
            fi
            
        else
            echo -e "${RED}❌ Failed to create webhook endpoint${NC}"
        fi
    fi
    
else
    echo -e "${YELLOW}⚠️  Stripe CLI not detected${NC}"
    echo "Manual setup required via Stripe Dashboard"
fi

echo ""
echo -e "${BLUE}📖 Manual Setup Instructions:${NC}"
echo ""
echo "If you prefer to set up manually or the CLI setup failed:"
echo ""
echo "1. Go to Stripe Dashboard > Webhooks"
echo "   https://dashboard.stripe.com/webhooks"
echo ""
echo "2. Click 'Add endpoint'"
echo ""
echo "3. Enter endpoint URL:"
echo "   $WEBHOOK_URL"
echo ""
echo "4. Select these events:"
echo "   ✅ customer.subscription.created"
echo "   ✅ customer.subscription.updated"
echo "   ✅ customer.subscription.deleted"
echo "   ✅ invoice.payment_succeeded"
echo "   ✅ invoice.payment_failed"
echo "   ✅ customer.subscription.trial_will_end"
echo ""
echo "5. Click 'Add endpoint'"
echo ""
echo "6. Copy the webhook signing secret (whsec_...)"
echo ""
echo "7. Update your environment variable:"
echo "   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here"
echo ""

echo -e "${BLUE}🧪 Testing Your Webhook:${NC}"
echo ""
echo "After setup, test your webhook:"
echo ""
echo "1. Use Stripe CLI to send test events:"
echo "   stripe trigger customer.subscription.created --api-key=sk_live_..."
echo ""
echo "2. Check webhook delivery in Stripe Dashboard:"
echo "   Dashboard > Webhooks > Your endpoint > Recent deliveries"
echo ""
echo "3. Monitor your application logs for webhook processing"
echo ""

echo -e "${YELLOW}⚠️  Important Security Notes:${NC}"
echo ""
echo "• Always use HTTPS for webhook endpoints"
echo "• Keep webhook secrets secure and never commit them"
echo "• Verify webhook signatures in your application"
echo "• Monitor webhook delivery success rates"
echo "• Set up proper logging for webhook events"
echo ""

echo -e "${GREEN}🎉 Production webhook setup complete!${NC}"
