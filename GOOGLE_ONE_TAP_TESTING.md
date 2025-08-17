# Testing Google One Tap on Homepage

## Quick Test Steps

### 1. Fix the 403 Error First

Follow the steps in `GOOGLE_ONE_TAP_403_FIX.md` to configure your Google OAuth client with the correct domains.

### 2. Start Your Servers

```bash
# Terminal 1 - Backend
npm run start:dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### 3. Test on Homepage

1. **Sign out** if you're currently logged in
2. Visit `http://localhost:3000` (or your dev server URL)
3. **Make sure you're signed into Google** in your browser
4. You should see the Google One Tap prompt appear automatically

### 4. Test on Login Page

1. Visit `http://localhost:3000/login`
2. One Tap should also appear here
3. Plus you have the traditional "Continue with Google" button as fallback

## Expected Behavior

### For Non-Authenticated Users

- **Homepage**: One Tap prompt appears automatically
- **Login Page**: One Tap prompt + traditional Google button

### For Authenticated Users

- **Homepage**: No One Tap (already logged in)
- **Login Page**: Should redirect to dashboard

## Console Logs to Look For

### Successful Initialization

```
🟢 [GOOGLE_ONE_TAP] Initializing with: {
  clientId: "203453576607-...",
  domain: "localhost",
  origin: "http://localhost:3000",
  auto_select: true,
  cancel_on_tap_outside: true,
  context: "signin"
}
🟢 [GOOGLE_ONE_TAP] Initialized successfully
```

### Successful Authentication

```
🟢 [GOOGLE_ONE_TAP] Starting credential verification
🟢 [GOOGLE_ONE_TAP] Google credential verified for: user@example.com
🟢 [GOOGLE_ONE_TAP] Authentication successful for: user@example.com
Google One Tap login successful
```

## Troubleshooting

### One Tap Not Appearing

1. **Check if you're already logged in** - One Tap won't show for authenticated users
2. **Ensure you're signed into Google** in your browser
3. **Clear cookies/cache** or use incognito mode
4. **Check console for errors** - especially the 403 error

### 403 Error Persists

1. Double-check Google Cloud Console domain configuration
2. Wait 10-15 minutes for changes to propagate
3. Verify you added both `localhost:3000` and `127.0.0.1:3000`

### One Tap Appears But Login Fails

1. Check backend logs for `/api/auth/google/verify` endpoint
2. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend env
3. Check network tab for failed API calls

## Current Implementation

### Homepage (`HomePage.tsx`)

- ✅ Google One Tap added for non-authenticated users
- ✅ Positioned just under the header
- ✅ Only shows prompt (no button)
- ✅ Redirects on successful authentication

### Login Page (`LoginPage.tsx`)

- ✅ Google One Tap for seamless sign-in
- ✅ Traditional Google OAuth button as fallback
- ✅ Handles redirect path properly

The implementation gives you the best user experience - seamless One Tap on homepage for quick access, with full authentication options on the login page.
