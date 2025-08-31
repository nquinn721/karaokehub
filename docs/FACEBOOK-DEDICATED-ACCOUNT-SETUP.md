# Facebook Dedicated Account Setup Guide

## Problem

Using your personal Facebook session in the parser causes your Messenger account to log out on your phone because Facebook detects multiple active sessions and logs out other devices for security.

## Solution: Dedicated Parser Account

### 1. Create a Dedicated Facebook Account

**Create a new Facebook account specifically for parsing:**

- Email: `karaokeparser@yourdomain.com` (or similar)
- Name: "Karaoke Parser" or "KaraokeHub Bot"
- Use a strong password
- Verify the account

### 2. Join Relevant Facebook Groups

**Important:** The dedicated account needs to be a member of the groups you want to parse:

- Join all the karaoke/music groups you need to monitor
- Request to join private groups (if needed)
- Build some basic profile activity to look legitimate

### 3. Update Parser Configuration

Once you have the dedicated account:

1. **Clear existing session:**

   ```bash
   rm data/facebook-cookies.json
   ```

2. **Login with the new account in the admin panel:**
   - Go to admin parser page
   - Trigger a Facebook parse that requires login
   - Enter the dedicated account credentials when prompted
   - The parser will save the new session cookies

### 4. Security Benefits

✅ **Advantages:**

- Your personal Facebook/Messenger stays logged in
- No more conflicts between parser and personal use
- Dedicated account can have specific group memberships
- Better separation of concerns
- Reduces risk to your personal account

⚠️ **Considerations:**

- Need to maintain the dedicated account
- May need to add friends/activity to look legitimate
- Some private groups may need approval

### 5. Implementation

The current parser system already supports this - just login with different credentials:

```typescript
// The parser will automatically use whatever account logs in
// No code changes needed, just use different credentials
```

## Alternative Solutions

### Option 2: Session Isolation (Advanced)

- Use browser profiles or containers
- More complex implementation
- Still requires separate login

### Option 3: Facebook Graph API (Limited)

- Only works for pages you own/manage
- Doesn't work for general group parsing
- API restrictions on group content

## Recommendation

**Use Solution 1 (Dedicated Account)** - it's the simplest, most reliable approach that completely solves the session conflict issue.
