-- Direct Cloud SQL Avatar Fix Script
-- This manually fixes the avatar data that the migration should have handled

USE `karaoke-hub`;

-- Show current state before fix
SELECT 'BEFORE FIX - Current avatar state:' as status;
SELECT id, name, type, rarity, price, coinPrice, isFree, isAvailable FROM avatars ORDER BY name;

-- Fix Onyx and Tyler specifically (they're still premium/uncommon)
UPDATE avatars 
SET 
  type = 'basic',
  rarity = 'common',
  price = 0.00,
  coinPrice = 0,
  isFree = 1
WHERE name IN ('Onyx', 'Tyler');

-- Also ensure all other avatars are properly set
UPDATE avatars 
SET 
  type = 'basic',
  rarity = 'common', 
  price = 0.00,
  coinPrice = 0,
  isFree = 1,
  isAvailable = 1;

-- Show state after fix
SELECT 'AFTER FIX - Updated avatar state:' as status;
SELECT id, name, type, rarity, price, coinPrice, isFree, isAvailable FROM avatars ORDER BY name;

-- Verify user_avatars table has valid references
SELECT 'User avatars validation:' as status;
SELECT 
  COUNT(*) as total_user_avatars,
  COUNT(a.id) as valid_references,
  COUNT(*) - COUNT(a.id) as invalid_references
FROM user_avatars ua
LEFT JOIN avatars a ON ua.avatarId = a.id;

-- Show user_avatars data
SELECT 'User avatars data:' as status;
SELECT ua.id, ua.userId, ua.avatarId, a.name as avatar_name, ua.isActive, ua.createdAt
FROM user_avatars ua
LEFT JOIN avatars a ON ua.avatarId = a.id
ORDER BY ua.createdAt DESC;

-- Final summary
SELECT 'FINAL STATUS:' as status;
SELECT 
  (SELECT COUNT(*) FROM avatars WHERE isAvailable = 1) as available_avatars,
  (SELECT COUNT(*) FROM avatars WHERE type = 'basic' AND rarity = 'common' AND isFree = 1) as fixed_avatars,
  (SELECT COUNT(*) FROM user_avatars) as user_avatar_records,
  (SELECT COUNT(*) FROM users WHERE equippedAvatarId IS NOT NULL) as users_with_avatars;

SELECT 'Cloud SQL avatar fix completed!' as status;