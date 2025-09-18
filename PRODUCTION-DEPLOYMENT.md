# Production Deployment Guide - Avatar System Update

## Overview
This update migrates from simple user avatar strings to a comprehensive avatar system with UserAvatar entities.

## Pre-Deployment Checklist

### Database Changes
1. **Entity Updates**: Microphone, Outfit, and Shoes enum values updated to match existing data
2. **User Avatar Population**: All existing users need UserAvatar records created

### Required Actions Before Deployment

1. **Run Migration**: 
   ```bash
   npm run migration:run
   ```

2. **Populate User Avatars** (choose one):
   
   **Option A - Using Node.js script:**
   ```bash
   npx ts-node scripts/populate-production-avatars.ts
   ```
   
   **Option B - Using bash script:**
   ```bash
   chmod +x scripts/setup-production-avatars.sh
   ./scripts/setup-production-avatars.sh
   ```
   
   **Option C - Manual SQL:**
   ```sql
   INSERT IGNORE INTO user_avatars (id, userId, baseAvatarId, isActive, createdAt, updatedAt)
   SELECT 
     UUID() as id,
     u.id as userId,
     'avatar_1' as baseAvatarId,
     true as isActive,
     NOW() as createdAt,
     NOW() as updatedAt
   FROM users u
   LEFT JOIN user_avatars ua ON u.id = ua.userId
   WHERE ua.userId IS NULL;
   ```

### Verification Steps

1. **Check user avatar count matches user count:**
   ```sql
   SELECT 
     (SELECT COUNT(*) FROM users) as users_count,
     (SELECT COUNT(*) FROM user_avatars) as user_avatars_count;
   ```

2. **Test API endpoints:**
   ```bash
   curl http://localhost:8000/api/friends
   curl http://localhost:8000/api/avatar/my-avatar
   ```

### Changes Made

#### Backend Changes:
- `friends.service.ts`: Updated to load UserAvatar relationships
- Entity enum values fixed to match database data
- Database config updated with avatar entities

#### Frontend Changes:
- `FriendFavoriteShowsModal.tsx`: Uses `userAvatar.baseAvatarId`
- `FriendsStore.ts`: Updated interface
- Avatar display components updated

### Rollback Plan
If issues occur, the migration can be reversed:
```bash
npm run migration:revert
```

### Post-Deployment Testing
1. Login to app
2. Check friends list shows avatars
3. Verify friend favorite shows modal displays properly
4. Test avatar selector functionality

## Notes
- All existing users will get default 'avatar_1' avatar
- Enum values now match: microphone (basic,vintage,modern,wireless,premium,golden), outfits (+fantasy), shoes (+platform)
- UserAvatar table uses OneToOne relationship with users
