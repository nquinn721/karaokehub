# URGENT: Google Maps API Security Action Plan

## 🚨 Critical Issue Summary

Google detected your unrestricted API key (ID: `9244b43b-56fa-4889-801e-2eb4c05c80f9`) is vulnerable to abuse and may generate unauthorized billing charges. Your current key in Google Cloud Secret `KARAOKE_HUB_GOOGLE_MAPS_API_KEY` is likely this problematic key.

## 🎯 Immediate Action Required (Next 24-48 Hours)

### Phase 1: Prepare New Restricted Keys (1-2 hours)

1. **Go to Google Cloud Console**: https://console.cloud.google.com/apis/credentials?project=heroic-footing-460117-k8

2. **Create 4 New API Keys** with these exact restrictions:

   **🔑 Server Key**: `KaraokeHub-Backend-Server`
   - Application restrictions: **IP addresses**
   - IP addresses:
     - Your Cloud Run service IPs (get from Cloud Run console)
     - `127.0.0.1` (for local development)
   - API restrictions: **Geocoding API, Distance Matrix API**

   **🌐 Client Key**: `KaraokeHub-Web-Client`
   - Application restrictions: **HTTP referrers (web sites)**
   - Website restrictions:
     - `https://karaoke-hub.com/*`
     - `http://localhost:*/*` (for development)
   - API restrictions: **Maps JavaScript API**

   **📱 Android Key**: `KaraokeHub-Android`
   - Application restrictions: **Android apps**
   - Package name: `com.karaokehub.app` (or your actual package name)
   - SHA-1: Your app's certificate fingerprint
   - API restrictions: **Maps SDK for Android**

   **🗺️ Static Key**: `KaraokeHub-Static-Maps`
   - Application restrictions: **None** (will use digital signatures)
   - API restrictions: **Maps Static API**

### Phase 2: Deploy Secure Configuration (30 minutes)

3. **Run Migration Script**:

   ```bash
   cd /d/Projects/KaraokeHub
   chmod +x migrate-google-maps-keys.sh
   bash migrate-google-maps-keys.sh
   ```

4. **The script will**:
   - Store new keys as Google Cloud Secrets
   - Set up proper IAM permissions
   - Deploy updated Cloud Run service
   - Provide testing instructions

### Phase 3: Verify & Disable Old Key (24-48 hours)

5. **Test All Functionality**:
   - Backend geocoding: `curl "https://karaoke-hub.com/api/geocoding/address?q=test"`
   - Venue search: Check your venue lookup features
   - Web maps: If using Maps JavaScript API
   - Mobile maps: If implemented in your app

6. **Monitor for 24-48 hours** for any API errors

7. **Disable Old Key**:
   - Go back to Google Cloud Console
   - Find the old unrestricted key
   - Click **"Disable"** (don't delete yet)
   - Monitor for another 24 hours
   - If no issues, **delete permanently**

## 🛠️ Files Already Updated

✅ **Code Changes Made**:

- `src/geocoding/geocoding.service.ts` - Uses new server key with fallback
- `src/config/config.controller.ts` - Serves client key to web browsers
- `.env.example` - Added new key variables with documentation

✅ **Infrastructure Updates**:

- `cloudrun-service.yaml` - Added new secret references
- `cloudbuild.yaml` - Added new keys to build secrets
- `.github/workflows/deploy.yml` - Updated GitHub Actions workflow

✅ **Scripts Created**:

- `audit-google-maps-security.sh` - Analysis of current setup
- `migrate-google-maps-keys.sh` - Interactive migration tool
- `secure-google-maps-keys.sh` - General security guide
- `docs/GOOGLE-MAPS-SECURITY-MIGRATION.md` - Complete documentation

## 🔍 Current Status Check

Your current Google Maps setup:

- ✅ **Secret exists**: `KARAOKE_HUB_GOOGLE_MAPS_API_KEY` (with potentially unsafe key)
- ✅ **Cloud Run configured**: Environment variable properly set
- ✅ **Code ready**: Backend service uses proper environment variable
- ❌ **Key restrictions**: Current key is unrestricted (the problem!)
- ❌ **New secrets**: Need to create 4 new restricted keys

## 📞 Emergency Contacts

- **Google Maps Platform Support**: https://cloud.google.com/maps-platform/support
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials?project=heroic-footing-460117-k8
- **Your project**: heroic-footing-460117-k8

## 🎯 Success Criteria

✅ **Phase 1 Complete**: 4 new restricted API keys created in Google Cloud Console  
✅ **Phase 2 Complete**: New keys stored as secrets and service deployed  
✅ **Phase 3 Complete**: All functionality tested and old key disabled

**Timeline**: Complete all phases within 48 hours to avoid potential billing issues or account suspension.

---

**Remember**: This is a critical security issue that could result in unexpected charges if not addressed promptly. The migration is designed to be backward-compatible, so you can always roll back if needed.
