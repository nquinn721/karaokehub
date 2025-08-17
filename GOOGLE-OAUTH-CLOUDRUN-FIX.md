# 🔑 Google OAuth Cloud Run Fix Guide

## Problem Summary

Google OAuth login doesn't work in Cloud Run due to several configuration issues:

1. **Wrong Callback URL**: The Google Strategy was using frontend URL instead of backend URL for OAuth callback
2. **Missing Environment Variables**: Cloud Run missing BACKEND_URL and ALLOWED_ORIGINS
3. **Google Console Configuration**: Callback URLs in Google Cloud Console not matching actual backend URLs
4. **CORS Issues**: Frontend and backend URLs not properly configured

## ✅ Solutions Applied

### 1. Fixed Google OAuth Strategy

**File: `src/auth/strategies/google.strategy.ts`**

**Problem:** Used `FRONTEND_URL` for OAuth callback instead of backend URL.

**Fix:** Now uses `BACKEND_URL` for production callback:

```typescript
const backendUrl = isProduction
  ? configService.get<string>('BACKEND_URL') ||
    'https://karaoke-hub.com'
  : 'http://localhost:8000';

// Callback URL is now: https://karaoke-hub.com/api/auth/google/callback
```

### 2. Updated Cloud Run Configuration

**File: `cloudrun-service.yaml`**

Added missing environment variables:

```yaml
- name: BACKEND_URL
  value: 'https://karaoke-hub.com'
- name: ALLOWED_ORIGINS
  value: 'https://karaoke-hub.com'
```

### 3. Updated Environment Template

**File: `.env.example`**

Added URL configuration section:

```bash
# URL Configuration
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000

# For Production
# FRONTEND_URL=https://your-domain.com
# BACKEND_URL=https://your-api-domain.com
# ALLOWED_ORIGINS=https://your-domain.com
```

## 🚀 Manual Steps Required

### 1. Update Google Cloud Console OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID
4. Update **Authorized redirect URIs** to include:
   - `http://localhost:8000/api/auth/google/callback` (development)
   - `https://karaoke-hub.com/api/auth/google/callback` (production)

### 2. Verify Google Secrets in Cloud Run

Make sure these secrets exist in Google Secret Manager:

```bash
# Check if secrets exist
gcloud secrets list | grep GOOGLE

# If missing, create them:
echo -n "YOUR_GOOGLE_CLIENT_ID" | gcloud secrets create KARAOKE_HUB_GOOGLE_CLIENT_ID --data-file=-
echo -n "YOUR_GOOGLE_CLIENT_SECRET" | gcloud secrets create KARAOKE_HUB_GOOGLE_CLIENT_SECRET --data-file=-
```

### 3. Grant Service Account Access to Secrets

```bash
# Grant access to Google OAuth secrets
gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_CLIENT_ID \
    --member="serviceAccount:203453576607-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_CLIENT_SECRET \
    --member="serviceAccount:203453576607-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 4. Redeploy to Cloud Run

```bash
# Deploy with updated configuration
gcloud run deploy karaokehub \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

Or commit and push to trigger GitHub Actions deployment:

```bash
git add .
git commit -m "fix: Configure Google OAuth callback URLs for Cloud Run"
git push origin main
```

## 🧪 Testing the Fix

### 1. Local Development Testing

1. Start both servers: `npm run start:dev` and `cd client && npm run dev`
2. Visit: `http://localhost:5173/login`
3. Click "Continue with Google"
4. Should redirect to: `http://localhost:8000/api/auth/google`
5. After Google auth, should return to: `http://localhost:5173/auth/success?token=...`

### 2. Production Testing

1. Visit: `https://karaoke-hub.com/login`
2. Click "Continue with Google"
3. Should redirect to: `https://karaoke-hub.com/api/auth/google`
4. After Google auth, should return to: `https://karaoke-hub.com/auth/success?token=...`

## 🔍 Debugging Steps

### Check OAuth Flow URLs

**Development:**

- Initiate: `http://localhost:8000/api/auth/google`
- Callback: `http://localhost:8000/api/auth/google/callback`
- Success: `http://localhost:5173/auth/success?token=...`

**Production:**

- Initiate: `https://karaoke-hub.com/api/auth/google`
- Callback: `https://karaoke-hub.com/api/auth/google/callback`
- Success: `https://karaoke-hub.com/auth/success?token=...`

### Check Cloud Run Logs

```bash
# View recent Cloud Run logs
gcloud logs read --service=karaokehub --limit=50

# Filter for OAuth-related logs
gcloud logs read --service=karaokehub --filter="resource.labels.service_name=karaokehub" --limit=20
```

### Common Error Messages

1. **"redirect_uri_mismatch"**:
   - Update Google Cloud Console redirect URIs to match exact backend URL
2. **"OAuth client not found"**:
   - Check Google Client ID/Secret are correctly stored in Secret Manager
3. **CORS errors**:
   - Verify ALLOWED_ORIGINS includes frontend URL

4. **"Cannot GET /api/auth/google/callback"**:
   - Check if OAuth routes are properly registered in AuthController

## 📋 Verification Checklist

- [ ] Google Cloud Console redirect URIs updated
- [ ] Google OAuth secrets exist in Secret Manager
- [ ] Service account has access to secrets
- [ ] Cloud Run environment variables updated
- [ ] Application redeployed to Cloud Run
- [ ] OAuth flow works in production
- [ ] No CORS errors in browser console
- [ ] JWT token generated successfully
- [ ] User profile loads after OAuth login

## 🎯 Root Cause Analysis

The primary issue was that the Google OAuth Strategy was configured with the **frontend URL** for the callback, but Google OAuth requires calling the **backend API endpoint** to complete the authentication flow.

**Before:**

```
Callback URL: https://karaoke-hub.com/api/auth/google/callback
(Frontend URL + API path = WRONG)
```

**After:**

```
Callback URL: https://karaoke-hub.com/api/auth/google/callback
(Backend URL + API path = CORRECT)
```

Since the frontend and backend are served from the same Cloud Run service, the URL is the same, but the configuration logic was incorrect.
