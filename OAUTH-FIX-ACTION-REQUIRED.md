# 🚨 IMMEDIATE ACTION REQUIRED: Google OAuth Cloud Run Fix

## Status: ✅ CODE FIXED - MANUAL STEPS NEEDED

The code has been fixed to resolve Google OAuth issues in Cloud Run. **Manual configuration steps are required to complete the fix.**

## 🔧 Code Changes Applied

### ✅ Fixed Files:

1. **`src/auth/strategies/google.strategy.ts`** - Fixed callback URL to use backend URL
2. **`src/auth/strategies/github.strategy.ts`** - Fixed callback URL for consistency
3. **`cloudrun-service.yaml`** - Added BACKEND_URL and ALLOWED_ORIGINS
4. **`.env.example`** - Added URL configuration section

## 🚀 MANUAL STEPS REQUIRED

### Step 1: Update Google OAuth Secrets (REQUIRED)

Run this script to update Google OAuth secrets:

```bash
./update-google-oauth-secrets.sh
```

### Step 2: Update Google Cloud Console (CRITICAL)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID
4. Update **Authorized redirect URIs** to include:
   - `https://karaoke-hub.com/api/auth/google/callback` (production)
   - `http://localhost:8000/api/auth/google/callback` (development)

### Step 3: Redeploy to Cloud Run

```bash
# Option A: Automatic deployment via GitHub Actions
git add .
git commit -m "fix: Google OAuth callback URLs for Cloud Run"
git push origin main

# Option B: Manual deployment
gcloud run deploy karaokehub --source . --region us-central1 --allow-unauthenticated
```

## 🧪 Testing After Deployment

### Production Test:

1. Visit: `https://karaoke-hub.com/login`
2. Click **"Continue with Google"**
3. Should successfully authenticate and redirect back

### Expected OAuth Flow:

1. **Initiate**: `https://karaoke-hub.com/api/auth/google`
2. **Google Auth**: User authenticates with Google
3. **Callback**: `https://karaoke-hub.com/api/auth/google/callback`
4. **Success**: `https://karaoke-hub.com/auth/success?token=JWT_TOKEN`

## 🔍 Root Cause Summary

**Problem**: Google OAuth Strategy was using `FRONTEND_URL` for callback instead of `BACKEND_URL`

**Solution**: Updated both Google and GitHub strategies to use `BACKEND_URL` for OAuth callbacks

**Impact**: Google OAuth will now work correctly in Cloud Run production environment

---

**⚠️ OAuth will not work until Google Cloud Console redirect URIs are updated!**
