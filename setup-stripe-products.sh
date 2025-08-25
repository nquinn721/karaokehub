#!/bin/bash
# Create Stripe Products and Prices for KaraokeHub
# This script creates the actual Stripe products and prices that need to be configured

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎵 KaraokeHub Stripe Product Setup${NC}"
echo "=================================================="

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${RED}❌ Stripe CLI is not installed${NC}"
    echo "Please install it first: https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Check if user is logged in
if ! stripe config --list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Please login to Stripe CLI first${NC}"
    echo "Run: stripe login"
    exit 1
fi

echo -e "${GREEN}🛍️ Creating Stripe Products and Prices...${NC}"
echo ""

# Create Ad-Free Product
echo -e "${BLUE}Creating Ad-Free subscription product...${NC}"
AD_FREE_PRODUCT=$(stripe products create \
  --name "KaraokeHub Ad-Free" \
  --description "Remove all ads from KaraokeHub for a clean, distraction-free experience" \
  --format=json | grep '"id"' | cut -d'"' -f4)

echo "✅ Created Ad-Free Product: $AD_FREE_PRODUCT"

# Create Ad-Free Price (Monthly)
echo -e "${BLUE}Creating Ad-Free monthly price ($1.99)...${NC}"
AD_FREE_PRICE=$(stripe prices create \
  --product $AD_FREE_PRODUCT \
  --unit-amount 199 \
  --currency usd \
  --recurring="interval=month" \
  --nickname "Ad-Free Monthly" \
  --format=json | grep '"id"' | cut -d'"' -f4)

echo "✅ Created Ad-Free Price: $AD_FREE_PRICE"

# Create Premium Product
echo -e "${BLUE}Creating Premium subscription product...${NC}"
PREMIUM_PRODUCT=$(stripe products create \
  --name "KaraokeHub Premium" \
  --description "Premium access with unlimited favorites, previews, and exclusive features" \
  --format=json | grep '"id"' | cut -d'"' -f4)

echo "✅ Created Premium Product: $PREMIUM_PRODUCT"

# Create Premium Price (Monthly)
echo -e "${BLUE}Creating Premium monthly price ($4.99)...${NC}"
PREMIUM_PRICE=$(stripe prices create \
  --product $PREMIUM_PRODUCT \
  --unit-amount 499 \
  --currency usd \
  --recurring="interval=month" \
  --nickname "Premium Monthly" \
  --format=json | grep '"id"' | cut -d'"' -f4)

echo "✅ Created Premium Price: $PREMIUM_PRICE"

echo ""
echo -e "${GREEN}🎉 All products and prices created successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Please update your environment with these price IDs:${NC}"
echo ""
echo "STRIPE_AD_FREE_PRICE_ID=$AD_FREE_PRICE"
echo "STRIPE_PREMIUM_PRICE_ID=$PREMIUM_PRICE"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Update cloudrun-service.yaml with the above price IDs"
echo "2. Redeploy your application"
echo "3. Test the checkout flow"
echo ""
echo -e "${YELLOW}💡 To update in production, run:${NC}"
echo "# Update cloudrun-service.yaml with the price IDs above"
echo "gcloud run services replace cloudrun-service.yaml --region=us-central1"
