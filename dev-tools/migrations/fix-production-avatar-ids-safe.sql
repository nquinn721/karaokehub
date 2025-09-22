-- Production Avatar ID Fix Script (Safe Version)
-- This script safely fixes invalid avatar IDs without creating duplicates

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

-- Step 3: Delete invalid user_avatars records instead of updating to avoid duplicates
DELETE FROM user_avatars 
WHERE avatarId NOT IN (SELECT id FROM avatars);

-- Step 4: Show results after deletion
SELECT 'Deleted invalid avatar references:' as status;
SELECT COUNT(*) as remaining_invalid_count 
FROM user_avatars ua 
LEFT JOIN avatars a ON ua.avatarId = a.id 
WHERE a.id IS NULL;

-- Step 5: Check for users who now might not have user_avatars records for their equipped avatar
SELECT 'Users missing user_avatars records for equipped avatar:' as status;
SELECT COUNT(*) as missing_records_count
FROM users u
LEFT JOIN user_avatars ua ON u.id = ua.userId AND u.equippedAvatarId = ua.avatarId
WHERE u.equippedAvatarId IS NOT NULL
AND ua.id IS NULL;

-- Step 6: Create missing user_avatars records for users with equipped avatars
INSERT INTO user_avatars (id, userId, avatarId, acquiredAt)
SELECT UUID(), u.id, u.equippedAvatarId, NOW()
FROM users u
LEFT JOIN user_avatars ua ON u.id = ua.userId AND u.equippedAvatarId = ua.avatarId
WHERE u.equippedAvatarId IS NOT NULL
AND ua.id IS NULL
AND u.equippedAvatarId IN (SELECT id FROM avatars);

-- Step 7: Fix any users with invalid equipped avatars
UPDATE users 
SET equippedAvatarId = @default_avatar_id 
WHERE equippedAvatarId IS NOT NULL 
AND equippedAvatarId NOT IN (SELECT id FROM avatars);

-- Step 8: Final verification
SELECT 'Final status:' as status;
SELECT 
  (SELECT COUNT(*) FROM avatars WHERE isAvailable = 1) as available_avatars,
  (SELECT COUNT(*) FROM user_avatars) as user_avatar_records,
  (SELECT COUNT(*) FROM user_avatars ua LEFT JOIN avatars a ON ua.avatarId = a.id WHERE a.id IS NULL) as invalid_avatar_refs,
  (SELECT COUNT(*) FROM users u LEFT JOIN avatars a ON u.equippedAvatarId = a.id WHERE u.equippedAvatarId IS NOT NULL AND a.id IS NULL) as invalid_equipped_refs;

SELECT 'Production avatar data fix completed safely!' as status;