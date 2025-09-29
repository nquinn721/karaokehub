-- Fix Rockstar Alex name discrepancy in production database
-- This script corrects "Rockstar Alexa" to "Rockstar Alex" and ensures correct image path

USE `karaoke-hub`;

-- Show current state
SELECT '=== BEFORE FIXES ===' as status;
SELECT id, name, imageUrl, type, rarity, coinPrice, isAvailable, isFree 
FROM avatars 
WHERE name LIKE '%Rockstar%Alex%' OR name LIKE '%Rockstar%Alexa%'
ORDER BY name;

-- Fix 1: Correct "Rockstar Alexa" to "Rockstar Alex"
UPDATE avatars 
SET name = 'Rockstar Alex',
    description = 'Rock star Alex with edgy attitude and leather jacket',
    imageUrl = '/images/avatar/avatars/alex-rock.png'
WHERE name = 'Rockstar Alexa';

-- Show affected rows count
SELECT ROW_COUNT() as rows_updated_name;

-- Fix 2: Ensure correct image path for Rockstar Alex (in case it exists with wrong image)
UPDATE avatars 
SET imageUrl = '/images/avatar/avatars/alex-rock.png',
    description = 'Rock star Alex with edgy attitude and leather jacket'
WHERE name = 'Rockstar Alex' AND imageUrl != '/images/avatar/avatars/alex-rock.png';

-- Show affected rows count
SELECT ROW_COUNT() as rows_updated_image;

-- Show final state
SELECT '=== AFTER FIXES ===' as status;
SELECT id, name, imageUrl, type, rarity, coinPrice, isAvailable, isFree 
FROM avatars 
WHERE name LIKE '%Rockstar%Alex%' OR name LIKE '%Rockstar%Alexa%'
ORDER BY name;

-- Verification: Check if any users have this avatar equipped or owned
SELECT '=== USER IMPACT CHECK ===' as status;

-- Check equipped avatars
SELECT 'Users with Rockstar Alex equipped:' as check_type;
SELECT u.id, u.email, u.stageName 
FROM users u 
INNER JOIN avatars a ON u.equippedAvatarId = a.id 
WHERE a.name = 'Rockstar Alex';

-- Check owned avatars
SELECT 'Users who own Rockstar Alex:' as check_type;
SELECT u.id, u.email, u.stageName 
FROM users u 
INNER JOIN user_avatars ua ON u.id = ua.userId
INNER JOIN avatars a ON ua.avatarId = a.id 
WHERE a.name = 'Rockstar Alex';

SELECT '=== FIX COMPLETED ===' as status;