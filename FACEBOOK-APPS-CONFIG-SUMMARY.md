# Facebook Apps Configuration Summary

## Two Facebook Apps Setup

### 1. Auth App (Original - for user authentication)
- **App ID**: `646464114624794`  
- **App Secret**: `3ce6645105081d6f3a5442a30bd6b1ae`
- **Purpose**: User login and authentication
- **Use Cases**: "Authenticate and request data from users with Facebook Login"
- **Environment Variables**:
  - `FACEBOOK_APP_ID`
  - `FACEBOOK_APP_SECRET`

### 2. Parser App (New - for content parsing)
- **App ID**: `1160707802576346`
- **App Secret**: `47f729de53981816dcce9b8776449b4b`  
- **Purpose**: Content parsing and data extraction
- **Use Cases**: 
  - "Manage everything on your Page"
  - "Access the Threads API" 
  - "Embed Facebook, Instagram and Threads content in other websites"
- **Environment Variables**:
  - `FACEBOOK_PARSER_APP_ID`
  - `FACEBOOK_PARSER_APP_SECRET`

## Configuration Files Updated

### 1. `.env.example`
- ✅ Added both app configurations with clear comments
- ✅ Separated auth vs parser app variables

### 2. `FacebookService.ts`
- ✅ Updated to support both apps
- ✅ `getAppAccessToken(useParser: boolean = true)` method
- ✅ Defaults to parser app for parsing operations
- ✅ Uses auth app for authentication operations

### 3. `create-facebook-secrets.sh`
- ✅ Creates secrets for both apps in Google Secret Manager
- ✅ Proper organization and naming

### 4. `cloudrun-service.yaml`
- ✅ Added environment variables for both apps
- ✅ Proper secret references for production deployment

### 5. `test-facebook-apps.js`
- ✅ Tests both apps independently
- ✅ Verifies access tokens work
- ✅ Shows expected permission errors for private groups

## Current Status

Both Facebook apps are working correctly:
- ✅ **Auth App**: Getting access tokens successfully
- ✅ **Parser App**: Getting access tokens successfully
- ❌ **Group Access**: Still requires user-level permissions (expected)

## Next Steps

1. **Add use cases to Parser App**:
   - "Manage everything on your Page"
   - "Access the Threads API"
   - "Embed Facebook content"

2. **Implement user authentication flow** for group access:
   - Users need to log in with Facebook
   - Users must be group members
   - Request appropriate permissions

3. **Deploy updated configuration**:
   ```bash
   # Update secrets
   ./create-facebook-secrets.sh
   
   # Deploy to Cloud Run
   ./deploy.sh
   ```

## Key Limitations

- **Private Groups**: Always require user-level authentication
- **App-level tokens**: Cannot access private group content
- **Permissions**: Users must grant access and be group members

The architecture is now properly set up to handle both authentication and parsing with separate Facebook apps!
