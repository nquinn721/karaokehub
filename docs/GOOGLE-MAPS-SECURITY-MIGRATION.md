# Google Maps API Key Security Migration

## Overview

This document outlines the migration from a single unrestricted Google Maps API key to multiple platform-specific restricted keys for enhanced security and billing control.

## Why This Migration is Critical

### Security Risks

- **Public Exposure**: Unrestricted keys can be abused by unauthorized parties
- **Billing Attacks**: Exposed keys can generate unexpected charges
- **Account Suspension**: Google may suspend accounts with unpaid unauthorized usage

### Current Issues Detected

- Single API key used across multiple platforms (web, mobile, server)
- Key potentially exposed in client-side code
- Unsigned Maps Static API requests
- No application restrictions on the key

## New Key Architecture

### 1. Backend Server Key (`GOOGLE_MAPS_SERVER_API_KEY`)

- **Purpose**: Geocoding and Distance Matrix APIs
- **Restrictions**: IP address restrictions
- **Allowed IPs**:
  - Cloud Run service IPs
  - `127.0.0.1` (local development)
- **APIs**: Geocoding API, Distance Matrix API

### 2. Web Client Key (`VITE_GOOGLE_MAPS_CLIENT_KEY`)

- **Purpose**: Maps JavaScript API for web browsers
- **Restrictions**: HTTP referrer restrictions
- **Allowed Domains**:
  - `https://karaokehub.com/*`
  - `https://*.karaokehub.com/*`
  - `http://localhost:*/*` (development)
- **APIs**: Maps JavaScript API, Places API (Web)

### 3. Android Mobile Key (`GOOGLE_MAPS_ANDROID_KEY`)

- **Purpose**: Maps SDK for mobile app
- **Restrictions**: Android app restrictions
- **Package Name**: `com.karaokehub.app`
- **SHA-1**: Your app's certificate fingerprint
- **APIs**: Maps SDK for Android

### 4. Static Maps Key (`GOOGLE_MAPS_STATIC_KEY`)

- **Purpose**: Static map images with digital signatures
- **Restrictions**: None (secured by digital signatures)
- **APIs**: Maps Static API
- **Security**: Requires implementing request signing

## Migration Steps

### Step 1: Create New API Keys

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=heroic-footing-460117-k8)
2. Create 4 new API keys with the restrictions above
3. Enable only the required APIs for each key

### Step 2: Update Environment Variables

```bash
# Production
gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY --data-file=-
gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY --data-file=-
gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_ANDROID_KEY --data-file=-
gcloud secrets create KARAOKE_HUB_GOOGLE_MAPS_STATIC_KEY --data-file=-

# Local Development (.env)
GOOGLE_MAPS_SERVER_API_KEY=your_server_key
VITE_GOOGLE_MAPS_CLIENT_KEY=your_client_key
GOOGLE_MAPS_ANDROID_KEY=your_android_key
GOOGLE_MAPS_STATIC_KEY=your_static_key
```

### Step 3: Update Cloud Run Service

Update `cloudrun-service.yaml`:

```yaml
env:
  - name: GOOGLE_MAPS_SERVER_API_KEY
    valueFrom:
      secretKeyRef:
        key: latest
        name: KARAOKE_HUB_GOOGLE_MAPS_SERVER_KEY
  - name: VITE_GOOGLE_MAPS_CLIENT_KEY
    valueFrom:
      secretKeyRef:
        key: latest
        name: KARAOKE_HUB_GOOGLE_MAPS_CLIENT_KEY
```

### Step 4: Test All Functionality

- [ ] Backend geocoding services
- [ ] Web client maps display
- [ ] Mobile app maps (if implemented)
- [ ] Static map generation

### Step 5: Disable Old Key

After confirming all functionality works with new keys:

1. Disable the old unrestricted key
2. Monitor for any broken functionality
3. Delete the old key after 48 hours of stable operation

## Code Changes Made

### Backend Service (`src/geocoding/geocoding.service.ts`)

- Updated to use `GOOGLE_MAPS_SERVER_API_KEY` with fallback
- Maintains backward compatibility during migration

### Client Configuration (`src/config/config.controller.ts`)

- Updated to serve `VITE_GOOGLE_MAPS_CLIENT_KEY` to web clients
- Fallback to old key during migration

### Environment Template (`.env.example`)

- Added all new key variables with documentation
- Marked old key as deprecated

## Security Best Practices

### Key Rotation

- Rotate API keys quarterly
- Use different keys for staging and production
- Monitor key usage in Google Cloud Console

### Access Control

- Limit key access to minimum required team members
- Use Google Cloud IAM for key management
- Audit key usage regularly

### Monitoring

- Set up billing alerts for unexpected usage
- Monitor API quotas and usage patterns
- Enable logging for all Maps API calls

## Troubleshooting

### Common Issues

1. **"API key not valid"**: Check key restrictions match request source
2. **"Quota exceeded"**: Verify you're using the correct key for each service
3. **"Request denied"**: Ensure referrer/IP restrictions are configured correctly

### Validation Commands

```bash
# Test server key (replace with your key)
curl "https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway&key=YOUR_SERVER_KEY"

# Test client key (in browser console)
// Should work from allowed domains only
fetch('https://maps.googleapis.com/maps/api/geocode/json?address=test&key=YOUR_CLIENT_KEY')
```

## Timeline

- **Day 1**: Create new keys and update environment variables
- **Day 2**: Deploy and test in staging environment
- **Day 3**: Deploy to production with monitoring
- **Day 5**: Disable old key if no issues detected
- **Day 7**: Delete old key permanently

## Support

- Google Maps Platform Support: https://cloud.google.com/maps-platform/support
- Internal team: Check with DevOps for key management procedures
