# Stripe Payment Integration Setup

This document outlines the complete Stripe payment integration setup for KaraokePal.

## Environment Variables

### Local Development (.env)

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_AD_FREE_PRICE_ID=price_ad_free_monthly
STRIPE_PREMIUM_PRICE_ID=price_premium_monthly
```

### Google Cloud Secrets

The following secrets need to be created in Google Secret Manager:

1. **KARAOKE_HUB_STRIPE_SECRET_KEY** - Your Stripe secret key (sk*test*... or sk*live*...)
2. **KARAOKE_HUB_STRIPE_PUBLISHABLE_KEY** - Your Stripe publishable key (pk*test*... or pk*live*...)
3. **KARAOKE_HUB_STRIPE_WEBHOOK_SECRET** - Webhook signing secret (whsec\_...)

Use the script to update secrets:

```bash
./update-stripe-secrets.sh sk_test_... pk_test_... whsec_...
```

## Subscription Plans

### 1. Free Plan

- **Price**: $0/month
- **Features**:
  - Basic music search
  - View karaoke shows
  - Ads included

### 2. Ad-Free Plan

- **Price**: $0.99/month
- **Features**:
  - All free features
  - No advertisements
  - Clean browsing experience

### 3. Premium Plan

- **Price**: $1.99/month
- **Features**:
  - All ad-free features
  - Favorite songs & shows
  - Add friends
  - Priority support
  - Advanced features

## Stripe Dashboard Setup

### 1. Create Products

1. Go to Stripe Dashboard > Products
2. Create two products:
   - **Ad-Free Plan** ($0.99/month recurring)
   - **Premium Plan** ($1.99/month recurring)

### 2. Get Price IDs

After creating products, copy the price IDs and update:

- `STRIPE_AD_FREE_PRICE_ID` in environment variables
- `STRIPE_PREMIUM_PRICE_ID` in environment variables

### 3. Set up Webhooks

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-app-url/api/subscription/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Paywall Features

### Protected Features

- **Favorites**: Requires Premium subscription
- **Friends**: Requires Premium subscription
- **Ad Removal**: Requires Ad-Free or Premium subscription

### Ad Placements

- Banner ads between featured categories
- Rectangle ads after every 3rd category
- Only shown to non-Ad-Free subscribers

## API Endpoints

### Subscription Management

- `GET /api/subscription/status` - Get user subscription status
- `POST /api/subscription/create-checkout-session` - Create Stripe checkout
- `POST /api/subscription/create-portal-session` - Create customer portal
- `POST /api/subscription/webhook` - Handle Stripe webhooks
- `GET /api/subscription/pricing` - Get available plans

### Usage Example

```typescript
// Check subscription status
const status = await apiStore.get('/api/subscription/status');
console.log(status.features.premium); // true/false

// Create checkout session
const checkout = await apiStore.post('/api/subscription/create-checkout-session', {
  plan: 'premium',
});
window.location.href = checkout.url;
```

## Frontend Components

### PaywallModal

Shows when users try to access premium features:

```tsx
<PaywallModal
  open={paywallOpen}
  onClose={() => setPaywallOpen(false)}
  feature="favorites"
  featureDescription="Save your favorite songs..."
/>
```

### Ad Components

```tsx
import { BannerAd, RectangleAd } from '@components/AdPlaceholder';

// Only show if user doesn't have ad-free access
{
  !subscriptionStore.hasAdFreeAccess && <BannerAd />;
}
```

### Subscription Store

```typescript
// Check subscription features
subscriptionStore.hasAdFreeAccess; // boolean
subscriptionStore.hasPremiumAccess; // boolean
subscriptionStore.shouldShowPaywall('favorites'); // boolean

// Create checkout session
await subscriptionStore.createCheckoutSession('premium');

// Open customer portal
await subscriptionStore.createPortalSession();
```

## Database Schema

### Subscription Entity

```sql
CREATE TABLE subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  stripeSubscriptionId VARCHAR(255) NOT NULL UNIQUE,
  stripeCustomerId VARCHAR(255) NOT NULL,
  plan ENUM('free', 'ad_free', 'premium') DEFAULT 'free',
  status ENUM('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing') DEFAULT 'incomplete',
  pricePerMonth DECIMAL(10,2) NOT NULL,
  currentPeriodStart DATETIME NULL,
  currentPeriodEnd DATETIME NULL,
  cancelAtPeriodEnd BOOLEAN DEFAULT FALSE,
  canceledAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### User Entity Updates

```sql
ALTER TABLE users ADD COLUMN stripeCustomerId VARCHAR(255) NULL;
```

## Deployment Steps

1. **Update Stripe Secrets**:

   ```bash
   ./update-stripe-secrets.sh sk_test_... pk_test_... whsec_...
   ```

2. **Update Price IDs** in cloudrun-service.yaml and cloudbuild.yaml

3. **Deploy to Cloud Run**:

   ```bash
   ./deploy.sh
   ```

4. **Test Integration**:
   - Create test subscription
   - Verify webhook handling
   - Test paywall functionality

## Testing

### Test Cards (Stripe Test Mode)

- **Success**: 4242424242424242
- **Decline**: 4000000000000002
- **Authentication Required**: 4000002500003155

### Test Webhooks

Use Stripe CLI to forward webhooks locally:

```bash
stripe listen --forward-to localhost:8000/api/subscription/webhook
```

## Security Considerations

1. **API Keys**: Never expose secret keys in frontend code
2. **Webhook Verification**: Always verify webhook signatures
3. **User Validation**: Verify user owns subscription before granting access
4. **Price Validation**: Validate prices server-side, not client-side

## Monitoring

- Monitor subscription events in Stripe Dashboard
- Track conversion rates and churn
- Set up alerts for failed payments
- Monitor webhook delivery success rates
