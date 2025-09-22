-- Production Avatar ID Fix Script
-- This script fixes invalid avatar IDs in the Google Cloud SQL database

USE `karaoke-hub`;

-- Step 1: Show current invalid avatar references
SELECT 'Invalid avatar references before fix:' as status;
SELECT ua.avatarId, COUNT(*) as count 
FROM user_avatars ua 
LEFT JOIN avatars a ON ua.avatarId = a.id 
WHERE a.id IS NULL 
GROUP BY ua.avatarId;

-- Step 2: Get the default avatar (Alex) to use as replacement
SELECT 'Using default avatar:' as status;
SELECT id, name FROM avatars WHERE name = 'Alex' LIMIT 1;
SET @default_avatar_id = (SELECT id FROM avatars WHERE name = 'Alex' LIMIT 1);

-- Step 3: Fix all invalid avatar references to point to Alex
UPDATE user_avatars 
SET avatarId = @default_avatar_id 
WHERE avatarId NOT IN (SELECT id FROM avatars);

-- Step 4: Show results after fix
SELECT 'Fixed avatar references - should be 0 invalid:' as status;
SELECT COUNT(*) as invalid_count 
FROM user_avatars ua 
LEFT JOIN avatars a ON ua.avatarId = a.id 
WHERE a.id IS NULL;

-- Step 5: Verify all users have valid equipped avatars
SELECT 'Users with invalid equipped avatars:' as status;
SELECT COUNT(*) as invalid_equipped_count
FROM users u
LEFT JOIN avatars a ON u.equippedAvatarId = a.id
WHERE u.equippedAvatarId IS NOT NULL 
AND a.id IS NULL;

-- Step 6: Fix any users with invalid equipped avatars
UPDATE users 
SET equippedAvatarId = @default_avatar_id 
WHERE equippedAvatarId IS NOT NULL 
AND equippedAvatarId NOT IN (SELECT id FROM avatars);

-- Step 7: Final verification
SELECT 'Final status:' as status;
SELECT 
  (SELECT COUNT(*) FROM avatars WHERE isAvailable = 1) as available_avatars,
  (SELECT COUNT(*) FROM user_avatars) as user_avatar_records,
  (SELECT COUNT(*) FROM user_avatars ua LEFT JOIN avatars a ON ua.avatarId = a.id WHERE a.id IS NULL) as invalid_avatar_refs,
  (SELECT COUNT(*) FROM users u LEFT JOIN avatars a ON u.equippedAvatarId = a.id WHERE u.equippedAvatarId IS NOT NULL AND a.id IS NULL) as invalid_equipped_refs;

SELECT 'Production avatar data fix completed!' as status;