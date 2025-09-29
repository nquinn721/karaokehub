-- Simple manual fix for Rockstar Alex avatar data issue
-- This script fixes the "Rockstar Alexa" -> "Rockstar Alex" name discrepancy
-- and ensures the correct image path is set

-- Check current state before fix
SELECT 'BEFORE FIX:' as status, id, name, imageUrl, type, rarity, coinPrice, isAvailable, isFree 
FROM avatars 
WHERE name LIKE '%Rockstar%Alex%' OR name LIKE '%Rockstar%Alexa%'
ORDER BY name;

-- Apply the fix
UPDATE avatars 
SET 
  name = 'Rockstar Alex',
  description = 'Rock star Alex with edgy attitude and leather jacket',
  imageUrl = '/images/avatar/avatars/alex-rock.png'
WHERE name = 'Rockstar Alexa' OR (name = 'Rockstar Alex' AND imageUrl != '/images/avatar/avatars/alex-rock.png');

-- Check results after fix
SELECT 'AFTER FIX:' as status, id, name, imageUrl, type, rarity, coinPrice, isAvailable, isFree 
FROM avatars 
WHERE name = 'Rockstar Alex'
ORDER BY name;

-- Check user impact
SELECT 'USERS WITH AVATAR EQUIPPED:' as status, COUNT(*) as count
FROM users u 
INNER JOIN avatars a ON u.equippedAvatarId = a.id 
WHERE a.name = 'Rockstar Alex';

SELECT 'USERS WHO OWN AVATAR:' as status, COUNT(*) as count
FROM user_avatars ua
INNER JOIN avatars a ON ua.avatarId = a.id 
WHERE a.name = 'Rockstar Alex';