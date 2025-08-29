# Authentication Loop Recovery Guide

If you're experiencing infinite redirect loops between login and dashboard pages, here are several recovery methods:

## Quick Recovery (Browser Console)

1. Open your browser's Developer Console (F12 → Console tab)
2. Run one of these commands:

### Method 1: Emergency Recovery (Nuclear Option)
```javascript
window.authStore.emergencyRecovery()
```
This will:
- Clear all localStorage and sessionStorage
- Clear all cookies
- Reset authentication state
- Redirect to login with cache busting

### Method 2: Standard Recovery
```javascript
window.authStore.clearAuthState()
```
This will:
- Clear authentication state
- Reset loop counters
- Reload the page

### Method 3: Manual Storage Clear
If the above don't work, run these commands one by one:
```javascript
localStorage.clear()
sessionStorage.clear()
location.reload()
```

## Prevention Mechanisms

The system now includes automatic loop detection:
- Tracks authentication failures
- After 3 failures within 5 minutes, automatically clears auth state
- Prevents infinite redirect cycles

## URL-Based Recovery

If you can't access the console, add `?recovery=1` to any URL:
```
https://yoursite.com/login?recovery=1
```

## Loop Detection Details

The system monitors:
- Number of authentication failures (max: 3)
- Time window for failures (5 minutes)
- Automatic state clearing when limits exceeded

## For Administrators

If users report being stuck in loops, have them:
1. Open browser console (F12)
2. Run: `window.authStore.emergencyRecovery()`
3. Or clear browser data manually

## Technical Details

Loop detection works by:
- Counting auth failures in `AuthStore`
- Checking for rapid consecutive failures
- Automatically clearing state when thresholds exceeded
- Providing manual recovery methods

The system prevents loops at:
- Store initialization
- Token validation failures
- Profile fetch errors
- Manual recovery triggers
