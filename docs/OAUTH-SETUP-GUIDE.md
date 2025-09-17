# OAuth Setup Guide

This guide covers the complete setup for Google and Facebook OAuth authentication for both local development and production environments.

## Current OAuth Redirect URLs

### Local Development

- **Google OAuth callback**: `http://localhost:8000/api/auth/google/callback`
- **Facebook OAuth callback**: `http://localhost:8000/api/auth/facebook/callback`

### Production

- **Google OAuth callback**: `https://karaoke-hub.com/api/auth/google/callback`
- **Facebook OAuth callback**: `https://karaoke-hub.com/api/auth/facebook/callback`

## Google OAuth Setup

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Find your OAuth 2.0 Client ID or create a new one

### 2. Configure Authorized Redirect URIs

Add both URLs to your Google OAuth client:

**For Local Development:**

```
http://localhost:8000/api/auth/google/callback
```

**For Production:**

```
https://karaoke-hub.com/api/auth/google/callback
```

### 3. Configure Authorized JavaScript Origins (Optional)

**Note**: For your current server-side OAuth implementation, JavaScript origins are NOT required. Your app uses `window.location.href` redirects to the backend, which handles all OAuth communication.

JavaScript origins are only needed if you use:

- Client-side OAuth libraries (like Google's JavaScript SDK)
- OAuth popup windows
- Direct API calls from frontend JavaScript to OAuth providers

**If you want to add them anyway (for future features):**

**For Local Development:**

```
http://localhost:5173
http://localhost:8000
```

**For Production:**

```
https://karaoke-hub.com
https://karaoke-hub.com
```

### 4. Environment Variables

**Local (.env file):**

```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
```

**Production (Google Secret Manager):**

- Secret Name: `KARAOKE_HUB_GOOGLE_CLIENT_ID`
- Secret Name: `KARAOKE_HUB_GOOGLE_CLIENT_SECRET`

## Facebook OAuth Setup

### 1. Facebook Developer Console

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Navigate to your app dashboard
3. Go to "Facebook Login" > "Settings"

### 2. Configure Valid OAuth Redirect URIs

Add both URLs:

**For Local Development:**

```
http://localhost:8000/api/auth/facebook/callback
```

**For Production:**

```
https://karaoke-hub.com/api/auth/facebook/callback
```

### 3. Configure App Domains

**For Local Development:**

```
localhost
```

**For Production:**

```
karaoke-hub.com
karaoke-hub.com
```

### 4. Site URL Configuration

**For Local Development:**

```
http://localhost:5173
```

**For Production:**

```
https://karaoke-hub.com
```

### 5. Environment Variables

**Local (.env file):**

```
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

**Production (Google Secret Manager):**

- Secret Name: `KARAOKE_HUB_FACEBOOK_APP_ID`
- Secret Name: `KARAOKE_HUB_FACEBOOK_APP_SECRET`

## Testing OAuth Flow

### Local Development Testing

1. Start the backend server:

   ```bash
   cd /d/Projects/KaraokeHub
   npm run dev
   ```

2. Start the frontend:

   ````bash
   cd /d/Projects/KaraokeHub/client
   npm start
   ```3. Navigate to `http://localhost:5173` and test OAuth login
   ````

### Production Testing

1. Navigate to `https://karaoke-hub.com`
2. Test OAuth login flows

## Common Issues and Solutions

### 1. "redirect_uri_mismatch" Error

**Cause**: The redirect URI in your OAuth provider doesn't match the callback URL being used.

**Solution**:

- Verify the callback URLs are exactly as listed above
- Check for typos, missing slashes, or protocol mismatches (http vs https)
- Ensure the OAuth provider settings match the environment you're testing

### 2. CORS Issues (Usually Not Applicable)

**Cause**: Frontend domain not configured as authorized origin.

**Solution**:

- Note: Your app uses server-side OAuth, so CORS issues are rare
- If you encounter CORS errors, you may need to add JavaScript origins
- Most CORS issues in OAuth are actually redirect URI mismatches

### 3. Environment Variable Issues

**Cause**: Missing or incorrect OAuth credentials.

**Solution**:

- Verify environment variables are set correctly
- Check that production secrets are properly configured in Google Secret Manager
- Restart servers after changing environment variables

## URL Management

The application uses a centralized `UrlService` that automatically handles environment-specific URLs:

- **Development**: Uses `localhost` URLs for both frontend and backend
- **Production**: Uses `karaoke-hub.com` for frontend and Cloud Run URL for OAuth callbacks

This ensures consistent URL handling across the application.

## Security Notes

1. **Never commit OAuth secrets** to version control
2. **Use different OAuth apps** for development and production when possible
3. **Regularly rotate OAuth secrets** in production
4. **Monitor OAuth usage** for suspicious activity
5. **Keep OAuth scopes minimal** (we only request public profile data)

## Troubleshooting Commands

### Check Current OAuth URLs:

```bash
cd /d/Projects/KaraokeHub
node -e "console.log('Local Google:', 'http://localhost:8000/api/auth/google/callback'); console.log('Prod Google:', 'https://karaoke-hub.com/api/auth/google/callback');"
```

### Test Backend OAuth Endpoints:

```bash
# Test Google OAuth initiation
curl http://localhost:8000/api/auth/google

# Test Facebook OAuth initiation
curl http://localhost:8000/api/auth/facebook
```

### Verify Environment Variables:

```bash
# Local development
cd /d/Projects/KaraokeHub
node -e "require('dotenv').config(); console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET'); console.log('FACEBOOK_APP_ID:', process.env.FACEBOOK_APP_ID ? 'SET' : 'NOT_SET');"
```
