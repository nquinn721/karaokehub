# Stripe Local Testing & Webhook Setup Guide

## 🏠 Local Development Setup

### 1. Install Stripe CLI

Download from: https://stripe.com/docs/stripe-cli

```bash
# Windows (using Chocolatey)
choco install stripe-cli

# macOS (using Homebrew)
brew install stripe/stripe-cli/stripe

# Linux
curl -s https://packages.stripe.com/api/v1/bintray-webhook | bash
```

### 2. Login to Stripe CLI

```bash
stripe login
```

### 3. Start Local Webhook Forwarding

```bash
# Forward webhooks to your local server
stripe listen --forward-to localhost:8000/api/subscription/webhook
```

This will:

- ✅ Generate a webhook signing secret
- ✅ Forward all webhook events to your local server
- ✅ Show you the webhook secret to use locally

### 4. Update Local Environment

Copy the webhook secret from Stripe CLI output and update your `.env`:

```env
# Use the webhook secret from Stripe CLI (starts with whsec_)
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

## 🧪 Local Testing Commands

### Test Subscription Creation

```bash
# Trigger a test subscription created event
stripe trigger customer.subscription.created
```

### Test Payment Success

```bash
# Trigger a successful payment
stripe trigger invoice.payment_succeeded
```

### Test Payment Failure

```bash
# Trigger a failed payment
stripe trigger invoice.payment_failed
```

### Test Customer Portal

```bash
# Create a test customer
stripe customers create --email="test@example.com" --name="Test User"
```

## 🚀 Production Webhook Setup

### 1. Stripe Dashboard Configuration

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://your-domain.com/api/subscription/webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`

### 2. Copy Webhook Secret

After creating the webhook:

1. Click on your new webhook endpoint
2. Click "Reveal" under "Signing secret"
3. Copy the secret (starts with `whsec_`)

### 3. Update Production Environment

```bash
# Update Google Cloud Secret (if using Cloud Run)
echo -n "whsec_your_actual_webhook_secret" | gcloud secrets versions add KARAOKE_HUB_STRIPE_WEBHOOK_SECRET --data-file=-

# Or update your production environment variables directly
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret
```

## 🔧 Testing Your Integration

### 1. Start Local Server

```bash
cd /d/Projects/KaraokePal
npm run start:dev
```

### 2. Start Stripe CLI Forwarding (separate terminal)

```bash
stripe listen --forward-to localhost:8000/api/subscription/webhook
```

### 3. Trigger Test Events

```bash
# Test subscription lifecycle
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

### 4. Monitor Webhook Events

Check your server logs for:

```
[Nest] INFO [SubscriptionService] Processing webhook event: customer.subscription.created
[Nest] INFO [SubscriptionService] Webhook processed successfully
```

## 🏗️ Development Workflow

### Daily Development

```bash
# Terminal 1: Start your app
npm run start:dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:8000/api/subscription/webhook

# Terminal 3: Test events as needed
stripe trigger customer.subscription.created
```

### Testing Payment Flows

1. Use Stripe test cards: `4242424242424242` (Visa)
2. Use test mode keys (pk*test*... and sk*test*...)
3. Monitor webhook events in real-time
4. Check database for subscription updates

## 🔍 Debugging Webhooks

### Check Webhook Logs

- **Local**: Check your server console logs
- **Production**: Use Stripe Dashboard > Webhooks > Your endpoint > Attempts

### Common Issues

- ❌ **Signature verification failed**: Check STRIPE_WEBHOOK_SECRET
- ❌ **Endpoint not found**: Verify URL path `/api/subscription/webhook`
- ❌ **Timeout**: Webhook handler taking too long (>30s)

### Test Webhook Endpoint

```bash
curl -X POST http://localhost:8000/api/subscription/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 📋 Checklist

### Local Setup ✅

- [ ] Stripe CLI installed
- [ ] Logged into Stripe CLI
- [ ] Webhook forwarding active
- [ ] Local webhook secret updated
- [ ] Test events triggering successfully

### Production Setup ✅

- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Correct events selected
- [ ] Production webhook secret updated
- [ ] Webhook endpoint URL verified
- [ ] SSL certificate valid (https)

## 🚨 Security Notes

- ⚠️ Never commit webhook secrets to git
- ⚠️ Always verify webhook signatures
- ⚠️ Use HTTPS in production
- ⚠️ Keep webhook secrets in secure environment variables
- ⚠️ Monitor webhook attempt logs regularly
