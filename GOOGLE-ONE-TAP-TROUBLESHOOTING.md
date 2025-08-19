🔧 **GOOGLE CLOUD CONSOLE VERIFICATION CHECKLIST**

📋 **Required Settings for Client ID: 203453576607-fjkvjl9f2sve5gsm4n94fdsgmphgcs8u.apps.googleusercontent.com**

### 1. OAuth 2.0 Client IDs Configuration:

✅ **Authorized JavaScript origins** (EXACT format required):

- http://localhost:5173
- http://127.0.0.1:5173
- https://karaoke-hub.com (if using HTTPS)

### 2. OAuth Consent Screen:

✅ **User Type**: External (unless you have Google Workspace)
✅ **Publishing Status**: Testing or Published
✅ **Test Users**: Add your Google account email
✅ **Scopes**: email, profile, openid (minimum)

### 3. APIs & Services:

✅ **Google+ API**: Enable (even though deprecated, sometimes required)
✅ **Google Identity API**: Enable
✅ **People API**: Enable

### 4. Common Issues:

❌ **Extra spaces** in origin URLs
❌ **Wrong protocol** (http vs https)
❌ **Missing ports** or wrong ports
❌ **Case sensitivity** in domains

### 5. Verification Steps:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth client ID
3. Verify EXACT URLs match above
4. Check if there are any warnings or errors
5. Save changes (even if no changes made)

### 6. If Still Failing - Create New Client:

- Sometimes OAuth clients get corrupted
- Create a completely new OAuth 2.0 Client ID
- Use the same configuration as above
- Update your code with the new client ID

### 7. Alternative - Use Environment-Specific Clients:

- Development: One client for localhost
- Production: Separate client for karaoke-hub.com
- This prevents cross-contamination issues
