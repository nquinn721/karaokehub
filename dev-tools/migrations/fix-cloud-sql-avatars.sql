-- Google Cloud SQL Avatar System Fix
-- This script converts avatar IDs to UUIDs and standardizes all avatars as basic/common/free

USE `karaoke-hub`;

-- Step 1: Show current avatar state
SELECT 'Current avatar state before fix:' as status;
SELECT id, name, type, rarity, price, coinPrice, isFree, isAvailable FROM avatars ORDER BY name;

-- Step 2: Create a mapping table for old ID to new UUID conversion
CREATE TEMPORARY TABLE avatar_id_mapping (
    old_id VARCHAR(255),
    new_uuid VARCHAR(36),
    avatar_name VARCHAR(255)
);

-- Step 3: Generate new UUIDs for each avatar and store mapping
INSERT INTO avatar_id_mapping (old_id, new_uuid, avatar_name)
SELECT 
    id as old_id,
    UUID() as new_uuid,
    name as avatar_name
FROM avatars;

-- Show the mapping
SELECT 'ID Mapping (old_id -> new_uuid):' as status;
SELECT * FROM avatar_id_mapping ORDER BY avatar_name;

-- Step 4: Update user_avatars table first (to maintain referential integrity)
UPDATE user_avatars ua
JOIN avatar_id_mapping aim ON ua.avatarId = aim.old_id
SET ua.avatarId = aim.new_uuid;

-- Also update baseAvatarId if it exists
UPDATE user_avatars ua
JOIN avatar_id_mapping aim ON ua.baseAvatarId = aim.old_id
SET ua.baseAvatarId = aim.new_uuid
WHERE ua.baseAvatarId IS NOT NULL;

-- Step 5: Update users table equipped avatar references
UPDATE users u
JOIN avatar_id_mapping aim ON u.equippedAvatarId = aim.old_id
SET u.equippedAvatarId = aim.new_uuid;

-- Step 6: Update avatars table with new UUIDs and standardize properties
UPDATE avatars a
JOIN avatar_id_mapping aim ON a.id = aim.old_id
SET 
    a.id = aim.new_uuid,
    a.type = 'basic',
    a.rarity = 'common', 
    a.price = 0.00,
    a.coinPrice = 0,
    a.isFree = 1,
    a.isAvailable = 1;

-- Step 7: Verify the changes
SELECT 'Updated avatar state:' as status;
SELECT id, name, type, rarity, price, coinPrice, isFree, isAvailable FROM avatars ORDER BY name;

-- Step 8: Verify user_avatars references are still valid
SELECT 'User avatars validation:' as status;
SELECT 
    COUNT(*) as total_user_avatars,
    COUNT(a.id) as valid_references,
    COUNT(*) - COUNT(a.id) as invalid_references
FROM user_avatars ua
LEFT JOIN avatars a ON ua.avatarId = a.id;

-- Step 9: Verify users equipped avatars are still valid  
SELECT 'Users equipped avatars validation:' as status;
SELECT 
    COUNT(*) as users_with_equipped_avatars,
    COUNT(a.id) as valid_equipped_references,
    COUNT(*) - COUNT(a.id) as invalid_equipped_references
FROM users u
LEFT JOIN avatars a ON u.equippedAvatarId = a.id
WHERE u.equippedAvatarId IS NOT NULL;

-- Step 10: Final summary
SELECT 'Final avatar system status:' as status;
SELECT 
    (SELECT COUNT(*) FROM avatars WHERE isAvailable = 1) as available_avatars,
    (SELECT COUNT(*) FROM avatars WHERE type = 'basic' AND rarity = 'common' AND isFree = 1) as standardized_avatars,
    (SELECT COUNT(*) FROM user_avatars) as user_avatar_records,
    (SELECT COUNT(*) FROM users WHERE equippedAvatarId IS NOT NULL) as users_with_avatars;

-- Clean up
DROP TEMPORARY TABLE avatar_id_mapping;

SELECT 'Google Cloud SQL avatar system fix completed!' as status;