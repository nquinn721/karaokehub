# Google One Tap 403 Error Fix Guide

## The Issue
You're getting a 403 (Forbidden) error from Google's GSI (Google Sign-In) service:
```
GET https://accounts.google.com/gsi/status?client_id=203453576607-fjkvjl9f2sve5gsm4n94fdsgmphgcs8u.apps.googleusercontent.com&cas=... 403 (Forbidden)
```

This happens because Google One Tap requires additional domain authorization beyond regular OAuth.

## Solution: Configure Authorized JavaScript Origins

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project that contains the OAuth credentials
3. Go to **APIs & Services** > **Credentials**

### Step 2: Edit Your OAuth 2.0 Client ID
1. Find your client ID: `203453576607-fjkvjl9f2sve5gsm4n94fdsgmphgcs8u.apps.googleusercontent.com`
2. Click the edit (pencil) icon next to it

### Step 3: Add Authorized JavaScript Origins
In the **Authorized JavaScript origins** section, make sure you have:

**For Development:**
- `http://localhost:3000` (your frontend dev server)
- `http://localhost:5173` (if using Vite)
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`

**For Production:**
- `https://karaoke-hub.com`
- `https://www.karaoke-hub.com` (if you use www subdomain)

### Step 4: Authorized Redirect URIs
Make sure these are also configured:

**For Development:**
- `http://localhost:3000/auth/success`
- `http://localhost:3000/auth/error`

**For Production:**
- `https://karaoke-hub.com/auth/success`
- `https://karaoke-hub.com/auth/error`

### Step 5: Save Changes
Click **Save** and wait a few minutes for changes to propagate.

## Additional Configuration for One Tap

### Enable Google Identity Services API
1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Identity Services API"
3. Click on it and enable it for your project

### Verify Domain Ownership (For Production)
1. Go to **Google Search Console**
2. Add and verify ownership of `karaoke-hub.com`
3. This is required for One Tap to work on your production domain

## Testing the Fix

### 1. Clear Browser Cache
- Clear cookies and cache for your domain
- Or use incognito/private browsing

### 2. Check Console Logs
After the fix, you should see:
```
🟢 [GOOGLE_ONE_TAP] Initializing with: {
  clientId: "203453576607-...",
  domain: "localhost" or "karaoke-hub.com",
  origin: "http://localhost:3000" or "https://karaoke-hub.com",
  ...
}
🟢 [GOOGLE_ONE_TAP] Initialized successfully
```

### 3. One Tap Should Appear
- Visit your homepage while signed into Google
- One Tap prompt should appear automatically
- No more 403 errors in network tab

## Common Issues & Solutions

### Issue: Still getting 403 after domain configuration
**Solution:** Wait 10-15 minutes for Google's changes to propagate

### Issue: One Tap not appearing on localhost
**Solution:** Make sure you've added all localhost variants:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

### Issue: Works on localhost but not production
**Solution:** 
1. Verify domain ownership in Google Search Console
2. Ensure HTTPS is properly configured
3. Check that production domain is in authorized origins

### Issue: One Tap appears but authentication fails
**Solution:** Check that your backend `/api/auth/google/verify` endpoint is working

## Environment-Specific Notes

### Development (localhost)
- One Tap should work with `http://localhost`
- Less strict requirements than production

### Production (karaoke-hub.com)
- Requires HTTPS
- Requires domain verification
- More strict security requirements

## Verification Steps

1. **Check Network Tab:** No more 403 errors from `accounts.google.com`
2. **Check Console:** See successful initialization logs
3. **Test One Tap:** Prompt appears when visiting homepage while signed into Google
4. **Test Authentication:** Clicking One Tap successfully logs you in

Once you've made these changes in Google Cloud Console, the 403 error should be resolved and Google One Tap will work properly on both your homepage and login page.
