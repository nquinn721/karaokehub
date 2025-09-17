end# 🎵 KaraokeHub Stripe Testing Setup

## 🚀 Quick Start

### 1. Install Stripe CLI

**Windows:**

```bash
# Using Chocolatey
choco install stripe-cli

# Or download from: https://github.com/stripe/stripe-cli/releases
```

**macOS:**

```bash
brew install stripe/stripe-cli/stripe
```

### 2. Login to Stripe

```bash
stripe login
```

### 3. Start Local Testing

```bash
# Option 1: Use our helper script
./stripe-test-local.bat setup          # Windows
./stripe-test-local.sh setup           # macOS/Linux

# Option 2: Manual command
stripe listen --forward-to localhost:8000/api/subscription/webhook
```

### 4. Update .env File

Copy the webhook secret from Stripe CLI output:

```env
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

## 🧪 Testing Commands

### Quick Test Suite

```bash
# Windows
./stripe-test-local.bat test-subscription

# macOS/Linux
./stripe-test-local.sh test-subscription
```

### Individual Tests

```bash
# Test successful payment
stripe trigger invoice.payment_succeeded

# Test failed payment
stripe trigger invoice.payment_failed

# Test subscription creation
stripe trigger customer.subscription.created
```

## 🚀 Production Setup

### Run Production Setup Script

```bash
./setup-production-webhook.sh
```

### Manual Production Setup

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.com/api/subscription/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to production environment

## 📋 Available Scripts

| Script                        | Purpose                  |
| ----------------------------- | ------------------------ |
| `stripe-test-local.sh`        | Local testing helper     |
| `stripe-test-local.bat`       | Windows version          |
| `setup-production-webhook.sh` | Production webhook setup |

## 🔍 Monitoring

### Check Webhook Status

```bash
stripe webhook-endpoints list
```

### View Recent Events

```bash
stripe events list --limit=10
```

### Real-time Logs

```bash
stripe listen --forward-to localhost:8000/api/subscription/webhook --print-json
```

## 🛠️ Development Workflow

### Daily Setup

1. **Terminal 1:** Start your app

   ```bash
   cd /d/Projects/KaraokeHub
   npm run start:dev
   ```

2. **Terminal 2:** Start webhook forwarding

   ```bash
   stripe listen --forward-to localhost:8000/api/subscription/webhook
   ```

3. **Terminal 3:** Test as needed
   ```bash
   stripe trigger customer.subscription.created
   ```

## ⚠️ Troubleshooting

### Common Issues

**Webhook signature verification failed:**

- Check `STRIPE_WEBHOOK_SECRET` in .env
- Make sure you're using the secret from `stripe listen`

**Endpoint not found:**

- Verify server is running on port 8000
- Check URL path: `/api/subscription/webhook`

**Events not processing:**

- Check server logs for errors
- Verify webhook events are selected correctly

### Test Cards

- **Success:** `4242424242424242`
- **Decline:** `4000000000000002`
- **3D Secure:** `4000000000003220`

## 📚 Documentation

- [Full Stripe Testing Guide](./docs/STRIPE-LOCAL-TESTING.md)
- [Stripe Integration Docs](./docs/STRIPE-INTEGRATION.md)
- [Official Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
