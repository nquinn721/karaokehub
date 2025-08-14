#!/bin/bash

# Stripe Local Testing Helper Script
# Usage: ./stripe-test-local.sh [command]

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎵 KaraokeHub Stripe Local Testing Helper${NC}"
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

case "${1:-help}" in
    "setup")
        echo -e "${BLUE}🔧 Setting up local webhook forwarding...${NC}"
        echo ""
        echo -e "${YELLOW}This will start webhook forwarding to localhost:8000${NC}"
        echo -e "${YELLOW}Copy the webhook secret (whsec_...) to your .env file${NC}"
        echo ""
        stripe listen --forward-to localhost:8000/api/subscription/webhook
        ;;
        
    "test-subscription")
        echo -e "${GREEN}🧪 Testing subscription events...${NC}"
        echo ""
        echo "1. Creating subscription..."
        stripe trigger customer.subscription.created
        
        echo "2. Processing payment..."
        stripe trigger invoice.payment_succeeded
        
        echo "3. Updating subscription..."
        stripe trigger customer.subscription.updated
        ;;
        
    "test-payment")
        echo -e "${GREEN}💳 Testing payment events...${NC}"
        echo ""
        echo "1. Successful payment..."
        stripe trigger invoice.payment_succeeded
        
        echo "2. Failed payment..."
        stripe trigger invoice.payment_failed
        ;;
        
    "test-customer")
        echo -e "${GREEN}👤 Creating test customer...${NC}"
        stripe customers create \
            --email="test@karaokehub.com" \
            --name="Test User" \
            --description="Local testing customer"
        ;;
        
    "products")
        echo -e "${GREEN}📦 Setting up test products...${NC}"
        
        # Create Ad-Free product
        PRODUCT_AD_FREE=$(stripe products create \
            --name="KaraokeHub Ad-Free" \
            --description="Ad-free karaoke experience" \
            --format=json | jq -r '.id')
            
        echo "Created Ad-Free product: $PRODUCT_AD_FREE"
        
        # Create Ad-Free price
        PRICE_AD_FREE=$(stripe prices create \
            --product="$PRODUCT_AD_FREE" \
            --unit-amount=999 \
            --currency=usd \
            --recurring[interval]=month \
            --format=json | jq -r '.id')
            
        echo "Created Ad-Free price: $PRICE_AD_FREE"
        
        # Create Premium product  
        PRODUCT_PREMIUM=$(stripe products create \
            --name="KaraokeHub Premium" \
            --description="Premium karaoke experience with all features" \
            --format=json | jq -r '.id')
            
        echo "Created Premium product: $PRODUCT_PREMIUM"
        
        # Create Premium price
        PRICE_PREMIUM=$(stripe prices create \
            --product="$PRODUCT_PREMIUM" \
            --unit-amount=1999 \
            --currency=usd \
            --recurring[interval]=month \
            --format=json | jq -r '.id')
            
        echo "Created Premium price: $PRICE_PREMIUM"
        
        echo ""
        echo -e "${YELLOW}📝 Update your .env file with these price IDs:${NC}"
        echo "STRIPE_AD_FREE_PRICE_ID=$PRICE_AD_FREE"
        echo "STRIPE_PREMIUM_PRICE_ID=$PRICE_PREMIUM"
        ;;
        
    "webhook-status")
        echo -e "${GREEN}🔍 Checking webhook endpoints...${NC}"
        stripe webhook-endpoints list
        ;;
        
    "events")
        echo -e "${GREEN}📋 Recent webhook events...${NC}"
        stripe events list --limit=10
        ;;
        
    "logs")
        echo -e "${GREEN}📜 Webhook forwarding logs...${NC}"
        echo "This will show real-time webhook events..."
        stripe listen --forward-to localhost:8000/api/subscription/webhook --print-json
        ;;
        
    "help"|*)
        echo -e "${BLUE}Available commands:${NC}"
        echo ""
        echo "  setup              Start webhook forwarding to localhost"
        echo "  test-subscription  Trigger subscription lifecycle events"
        echo "  test-payment       Trigger payment success/failure events"  
        echo "  test-customer      Create a test customer"
        echo "  products           Create test products and prices"
        echo "  webhook-status     List webhook endpoints"
        echo "  events             Show recent webhook events"
        echo "  logs               Show real-time webhook logs"
        echo ""
        echo -e "${YELLOW}Example usage:${NC}"
        echo "  ./stripe-test-local.sh setup"
        echo "  ./stripe-test-local.sh test-subscription"
        echo ""
        echo -e "${YELLOW}For more help, see:${NC} docs/STRIPE-LOCAL-TESTING.md"
        ;;
esac
