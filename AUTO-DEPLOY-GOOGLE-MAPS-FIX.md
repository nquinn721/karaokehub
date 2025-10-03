# GitHub Actions Auto-Deploy: Google Maps API Security Fix

## ✅ Your Deployment Setup (Confirmed)

- **Auto-deploy**: GitHub Actions triggers on push to `main` branch
- **File**: `.github/workflows/deploy.yml`
- **Method**: `gcloud run deploy` with `--update-secrets` parameters
- **No manual YAML**: Cloud Run service is managed through GitHub Actions

## 🎯 Comprehensive Fix for Auto-Deploy

### Phase 1: Create New Restricted API Keys (Google Cloud Console)

**You MUST do this first before any code changes will help:**

1. Go to: https://console.cloud.google.com/apis/credentials?project=heroic-footing-460117-k8

2. Create these 4 new API keys with restrictions:

   **Server Key**: `KaraokeHub-Backend-Server`

   ```
   Application restrictions: IP addresses
   - Add your Cloud Run service external IPs
   - Add 127.0.0.1 (local dev)
   API restrictions: Geocoding API, Distance Matrix API
   ```

   **Client Key**: `KaraokeHub-Web-Client`

   ```
   Application restrictions: HTTP referrers (web sites)
   - https://karaoke-hub.com/*
   - http://localhost:*/*
   API restrictions: Maps JavaScript API, Places API (Web)
   ```

   **Android Key**: `KaraokeHub-Android`

   ```
   Application restrictions: Android apps
   - Package: com.karaokehub.app
   - SHA-1: Your certificate fingerprint
   API restrictions: Maps SDK for Android
   ```

   **Static Key**: `KaraokeHub-Static-Maps`

   ```
   Application restrictions: None (uses digital signatures)
   API restrictions: Maps Static API
   ```

### Phase 2: Store Keys as Google Cloud Secrets

After creating the keys above, run these commands:

```bash
# Store the new restricted keys as secrets
echo -n "YOUR_SERVER_KEY_HERE" | gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY --data-file=- --project=heroic-footing-460117-k8

echo -n "YOUR_CLIENT_KEY_HERE" | gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY --data-file=- --project=heroic-footing-460117-k8

echo -n "YOUR_ANDROID_KEY_HERE" | gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_ANDROID_KEY --data-file=- --project=heroic-footing-460117-k8

echo -n "YOUR_STATIC_KEY_HERE" | gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_STATIC_KEY --data-file=- --project=heroic-footing-460117-k8

# Grant Cloud Run service access
CLOUD_RUN_SA="203453576607-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY --member="serviceAccount:$CLOUD_RUN_SA" --role="roles/secretmanager.secretAccessor" --project=heroic-footing-460117-k8

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY --member="serviceAccount:$CLOUD_RUN_SA" --role="roles/secretmanager.secretAccessor" --project=heroic-footing-460117-k8

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_MAPS_ANDROID_KEY --member="serviceAccount:$CLOUD_RUN_SA" --role="roles/secretmanager.secretAccessor" --project=heroic-footing-460117-k8

gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_MAPS_STATIC_KEY --member="serviceAccount:$CLOUD_RUN_SA" --role="roles/secretmanager.secretAccessor" --project=heroic-footing-460117-k8
```

### Phase 3: Push Code Changes (Auto-Deploy)

**The GitHub Actions workflow is already updated** to deploy the new secrets. When you push to `main`, it will automatically:

1. ✅ **Deploy new environment variables**:
   - `GOOGLE_MAPS_SERVER_API_KEY` (for backend geocoding)
   - `VITE_GOOGLE_MAPS_CLIENT_KEY` (for web client)
   - Keep `GOOGLE_MAPS_API_KEY` for backward compatibility

2. ✅ **Updated code is ready**:
   - Backend service will use the new server key
   - Config endpoint will serve the client key
   - Fallback to old key during transition

3. **Trigger deployment**:
   ```bash
   git add .
   git commit -m "fix: implement Google Maps API key security restrictions"
   git push origin main
   ```

### Phase 4: Verify Deployment

After GitHub Actions completes:

1. **Check Cloud Run service**: https://console.cloud.google.com/run/detail/us-central1/karaokehub/revisions?project=heroic-footing-460117-k8

2. **Test API endpoints**:

   ```bash
   # Test geocoding (should use server key)
   curl "https://karaoke-hub.com/api/geocoding/address?q=1600+Amphitheatre+Parkway"

   # Test config endpoint (should serve client key)
   curl "https://karaoke-hub.com/api/config/client"
   ```

3. **Check environment variables** in Cloud Run console under "Variables & Secrets" tab

### Phase 5: Disable Old Key (After 24-48 hours of testing)

1. Go to: https://console.cloud.google.com/apis/credentials?project=heroic-footing-460117-k8
2. Find your old unrestricted key (the one from Google's email)
3. **Disable** it (don't delete yet)
4. Monitor for 24-48 hours
5. If no issues, **delete permanently**

## 🔄 How Auto-Deploy Handles This

Your GitHub Actions workflow (`.github/workflows/deploy.yml`) includes:

```yaml
--update-secrets GOOGLE_MAPS_SERVER_API_KEY=KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY:latest \
--update-secrets VITE_GOOGLE_MAPS_CLIENT_KEY=KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY:latest \
```

This means:

- ✅ **Every push to main** will deploy the new secrets
- ✅ **No manual YAML editing** required
- ✅ **Automatic rollout** of the security fix
- ✅ **Zero downtime** deployment

## ⚡ Quick Commands Summary

```bash
# 1. Create secrets (after making API keys in console)
# [Run the gcloud secrets create commands above]

# 2. Push to deploy
git add .
git commit -m "fix: Google Maps API security restrictions"
git push origin main

# 3. Monitor deployment
# Check: https://github.com/nquinn721/karaokehub/actions
```

## 🎯 This IS Comprehensive Because:

1. **✅ Backend Security**: Server uses IP-restricted key for geocoding
2. **✅ Frontend Security**: Client gets domain-restricted key
3. **✅ Auto-Deploy Ready**: GitHub Actions will handle deployment
4. **✅ Backward Compatible**: Fallback to existing key during transition
5. **✅ Zero Downtime**: Rolling deployment through Cloud Run
6. **✅ Monitoring Ready**: Environment variables visible in Cloud Run console

The fix is comprehensive for auto-deploy because **the real security issue is the API key restrictions, not the deployment method**. Once you create the restricted keys and store them as secrets, your existing auto-deploy will handle the rest automatically!
