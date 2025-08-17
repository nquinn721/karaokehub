# Google OAuth Debug Information

## Current Configuration (Working):

- **Client ID**: `203453576607-qnjhb8tvf0pp8629bvpq9lbrg6mq.apps.googleusercontent.com`
- **Client Secret**: `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`
- **Project**: `heroic-footing-460117-k8` (project number: 203453576607)

## OAuth URLs Being Generated:

- **Auth URL**: `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=https%3A%2F%2Fkaraoke-hub.com%2Fapi%2Fauth%2Fgoogle%2Fcallback&scope=email%20profile&client_id=203453576607-qnjhb8tvf0pp8629bvpq9lbrg6mq.apps.googleusercontent.com`
- **Redirect URI**: `https://karaoke-hub.com/api/auth/google/callback`

## Required Google Cloud Console Settings:

### Authorized Redirect URIs (MUST INCLUDE):

```
https://karaoke-hub.com/api/auth/google/callback
https://karaoke-hub.com/api/auth/google/callback
http://localhost:8000/api/auth/google/callback
```

### Authorized JavaScript Origins (MUST INCLUDE):

```
https://karaoke-hub.com
https://karaoke-hub.com
http://localhost:5173
http://localhost:8000
```

## Error Details:

- **Error**: "Error 401: invalid_client"
- **Message**: "The OAuth client was not found."
- **Likely Cause**: Missing redirect URI in Google Cloud Console or client was deleted/modified

## Next Steps:

1. Verify the OAuth client exists in Google Cloud Console
2. Ensure all redirect URIs are properly configured
3. If client was deleted, create a new one and update secrets
4. Test the OAuth flow again

## Test URLs:

- **Production**: https://karaoke-hub.com (click "Login with Google")
- **Cloud Run Direct**: https://karaoke-hub.com
- **OAuth Test**: https://karaoke-hub.com/api/auth/google
