# Fix Google Maps API Error - Production

## Current Issue
`ApiProjectMapError` in production indicates Google Maps API configuration problems.

## API Key Details
- Current Key: `AIzaSyCJgu_sx8VjMTj7iphIekriBeTjeKjHuiY`
- Secret Name: `KARAOKE_HUB_GOOGLE_MAPS_API_KEY`
- Project: `heroic-footing-460117-k8`

## Steps to Fix (DO NOT DELETE EXISTING ENV VARS)

### 1. Check API Key Status in Google Cloud Console
```bash
# Check if the key exists and is valid
gcloud secrets versions access latest --secret="KARAOKE_HUB_GOOGLE_MAPS_API_KEY" --project="heroic-footing-460117-k8"
```

### 2. Verify API is Enabled
Go to Google Cloud Console → APIs & Services → Enabled APIs
- Ensure "Maps JavaScript API" is enabled
- Ensure "Geocoding API" is enabled
- Ensure "Places API" is enabled (if used)

### 3. Check API Key Restrictions
In Google Cloud Console → APIs & Services → Credentials:
- Click on the API key
- Check "Application restrictions":
  - Should be "HTTP referrers (web sites)"
  - Add these referrers:
    - `https://karaoke-hub.com/*`
    - `https://*.karaoke-hub.com/*`
    - `http://localhost:3000/*` (for development)
    - `http://localhost:5173/*` (for Vite dev)

### 4. Check API Restrictions
- Ensure "Maps JavaScript API" is in the "Restrict key" list
- Ensure "Geocoding API" is in the "Restrict key" list

### 5. Verify Billing
- Check that billing is enabled for the project
- Verify no quota limits are exceeded

### 6. Update Secret (if needed)
```bash
# Only run if you get a new API key
# This preserves all other environment variables
echo -n "NEW_API_KEY_HERE" | gcloud secrets versions add KARAOKE_HUB_GOOGLE_MAPS_API_KEY \
    --project=heroic-footing-460117-k8 \
    --data-file=-
```

### 7. Restart Cloud Run Service
```bash
# This preserves all existing environment variables
gcloud run services update karaokehub \
    --project=heroic-footing-460117-k8 \
    --region=us-central1
```

## Common Causes of ApiProjectMapError
1. **API not enabled** - Maps JavaScript API disabled
2. **Referrer restrictions** - Domain not in allowed list
3. **Billing disabled** - No billing account attached
4. **Quota exceeded** - Daily/monthly limits reached
5. **Invalid key** - Key was regenerated or deleted

## Test After Fix
1. Open https://karaoke-hub.com/shows
2. Check browser console for errors
3. Verify map loads and markers appear

## Fallback Options
If the current key can't be fixed:
1. Create new API key in Google Cloud Console
2. Add proper restrictions (domains above)
3. Update the secret using command in step 6
4. Restart Cloud Run service
