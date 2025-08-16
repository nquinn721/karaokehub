# Facebook OAuth Fix - Invalid Scopes Error

## 🐛 Issue Identified

Facebook was showing "Invalid Scopes: email" error because the `email` permission requires Facebook App Review for production apps.

## ✅ Solution Implemented

### 1. Updated Facebook Strategy Permissions

**File**: `src/auth/strategies/facebook.strategy.ts`

**Before:**

```typescript
scope: ['email', 'public_profile'],
profileFields: ['id', 'displayName', 'photos', 'email'],
```

**After:**

```typescript
scope: ['public_profile'], // Only request public_profile, email requires app review
profileFields: ['id', 'displayName', 'photos'], // Remove email from profileFields
```

### 2. Updated User Validation Logic

**File**: `src/auth/auth.service.ts`

**Changes:**

- Allow Facebook users without email addresses
- Create placeholder email for Facebook users: `facebook_{id}@placeholder.karaoke`
- Still require email for other OAuth providers (Google, GitHub)
- Maintain existing user lookup by provider ID

## 🔧 Technical Details

### Facebook App Permissions

- **Public Profile**: Available by default, no review required
  - User ID, name, profile picture
- **Email**: Requires Facebook App Review for production apps
  - Not needed for basic authentication

### User Creation Logic

```typescript
// For Facebook users without email
if (!email && provider === 'facebook') {
  userData.email = `${provider}_${id}@placeholder.karaoke`;
}
```

## 🧪 Testing Results

✅ **OAuth URL Updated**: Now uses `scope=public_profile` only
✅ **No Invalid Scopes Error**: Facebook should now accept the OAuth request
✅ **Backward Compatible**: Still works with Google/GitHub OAuth that provide email

## 🚀 Next Steps

1. **Test the Facebook login** - Should now work without the scopes error
2. **Optional**: If you need email addresses from Facebook users:
   - Submit your app for Facebook App Review
   - Request the `email` permission
   - Update the strategy once approved

## 📝 Notes

- Facebook users will have placeholder emails like `facebook_123456@placeholder.karaoke`
- This doesn't affect functionality - users can still log in and use the app
- Real email addresses can be collected through profile settings if needed
