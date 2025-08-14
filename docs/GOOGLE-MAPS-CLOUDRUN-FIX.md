# Google Maps Cloud Run Deployment Fix

## Problem

Google Maps wasn't working in Cloud Run because:

1. **Missing Build-Time API Key**: The Vite React app needs `VITE_GOOGLE_MAPS_API_KEY` at build time, but it wasn't being passed to Docker build
2. **Missing Runtime API Key**: Cloud Run didn't have access to the Google Maps API key
3. **Missing GitHub Secret**: GitHub Actions couldn't pass the API key during Docker build
4. **Missing Google Cloud Secret**: The API key wasn't stored in Google Cloud Secret Manager

## Solution Applied

### ✅ 1. Fixed GitHub Actions Build

**File: `.github/workflows/deploy.yml`**

- Added `--build-arg VITE_GOOGLE_MAPS_API_KEY=${{ secrets.VITE_GOOGLE_MAPS_API_KEY }}` to Docker build
- Added `--update-secrets VITE_GOOGLE_MAPS_API_KEY=KARAOKE_HUB_GOOGLE_MAPS_API_KEY:latest` to Cloud Run deploy

### ✅ 2. Fixed Cloud Run Service Configuration

**File: `cloudrun-service.yaml`**

- Added `VITE_GOOGLE_MAPS_API_KEY` environment variable pointing to Google Cloud Secret

### ✅ 3. Updated Secret Creation Script

**File: `create-secrets.sh`**

- Added Google Maps API key to secret creation
- Added OpenAI API key to secret creation

### ✅ 4. Created Dedicated Google Maps Secret Script

**File: `create-google-maps-secret.sh`**

- Standalone script to create just the Google Maps API key secret

## Manual Steps Required

### 1. Add GitHub Repository Secret

Go to GitHub Repository Settings → Secrets and Variables → Actions → New Repository Secret:

- **Name**: `VITE_GOOGLE_MAPS_API_KEY`
- **Value**: `AIzaSyCJgu_sx8VjMTj7iphIekriBeTjeKjHuiY`

### 2. Create Google Cloud Secret (Choose One)

**Option A - Run the dedicated script:**

```bash
chmod +x create-google-maps-secret.sh
./create-google-maps-secret.sh
```

**Option B - Manual gcloud command:**

```bash
echo -n "AIzaSyCJgu_sx8VjMTj7iphIekriBeTjeKjHuiY" | gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_API_KEY --data-file=-
```

**Option C - Run the full secrets script:**

```bash
chmod +x create-secrets.sh
./create-secrets.sh
```

### 3. Grant Service Account Access

```bash
gcloud secrets add-iam-policy-binding KARAOKE_HUB_GOOGLE_MAPS_API_KEY \
    --member="serviceAccount:karaokehub-service-account@heroic-footing-460117-k8.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 4. Redeploy Application

After creating the secrets, push to main branch to trigger deployment:

```bash
git add .
git commit -m "fix: Configure Google Maps API key for Cloud Run deployment"
git push origin main
```

## Verification

1. **Build Time**: The React app should build with the API key embedded
2. **Runtime**: The MapComponent should receive the API key and render maps
3. **Console**: No more "Google Maps API key not configured" warnings

## API Key Details

- **Local Development**: Uses `.env` file with `VITE_GOOGLE_MAPS_API_KEY=...`
- **Docker Build**: Uses build argument `--build-arg VITE_GOOGLE_MAPS_API_KEY=...`
- **Cloud Run**: Uses Google Secret Manager secret `KARAOKE_HUB_GOOGLE_MAPS_API_KEY`

The API key `AIzaSyCJgu_sx8VjMTj7iphIekriBeTjeKjHuiY` is configured for:

- Google Maps JavaScript API
- Geocoding API
- Places API (if needed)
- Restricted to karaokehub domain

## Flow Summary

```
GitHub Secret → GitHub Actions → Docker Build Arg → React Build → Static Files → Cloud Run
                                                   ↓
GitHub Secret → GitHub Actions → Cloud Run Env Var → Runtime Access (backup)
```
