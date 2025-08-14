# ⚠️ IMPORTANT: GitHub Secret Required

The GitHub Actions deployment will **fail** until you add the following GitHub repository secret:

## Add GitHub Repository Secret

1. Go to your GitHub repository: https://github.com/nquinn721/karaokehub
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
   - **Name**: `VITE_GOOGLE_MAPS_API_KEY`
   - **Value**: `AIzaSyCJgu_sx8VjMTj7iphIekriBeTjeKjHuiY`
5. Click **Add secret**

## After Adding the Secret

1. Go to Actions tab in GitHub
2. Re-run the failed deployment (if it failed)
3. OR make another commit to trigger a new deployment

## Why This is Needed

The GitHub Actions workflow now includes:

```yaml
--build-arg VITE_GOOGLE_MAPS_API_KEY=${{ secrets.VITE_GOOGLE_MAPS_API_KEY }}
```

Without this GitHub secret, the Docker build will receive an empty API key, and Google Maps won't work in production.

## Quick Test After Deployment

Once deployed, visit your Cloud Run URL and check:

1. Open the map page
2. Check browser console for any Google Maps API errors
3. Verify maps are loading correctly

The fix should resolve the "Google Maps API key not configured" error in Cloud Run.
