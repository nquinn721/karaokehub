-- Fix users without default avatars and microphones
-- This script ensures every user has at least one avatar and microphone

-- Step 1: Check current state
SELECT 
  'BEFORE FIX:' as status,
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_avatars ua ON u.id = ua.userId WHERE ua.userId IS NULL) as users_without_avatars,
  (SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_microphones um ON u.id = um.userId WHERE um.userId IS NULL) as users_without_microphones,
  (SELECT COUNT(*) FROM users WHERE equippedAvatarId IS NULL OR equippedMicrophoneId IS NULL) as users_without_equipped_items;

-- Step 2: Add default avatar records for users who don't have any
INSERT INTO user_avatars (id, userId, baseAvatarId, isActive, createdAt, updatedAt)
SELECT 
  gen_random_uuid(),
  u.id,
  (SELECT id FROM avatars WHERE isFree = true AND isAvailable = true ORDER BY id LIMIT 1),
  true,
  NOW(),
  NOW()
FROM users u
LEFT JOIN user_avatars ua ON u.id = ua.userId
WHERE ua.userId IS NULL
  AND EXISTS (SELECT 1 FROM avatars WHERE isFree = true AND isAvailable = true);

-- Step 3: Add default microphone records for users who don't have any
INSERT INTO user_microphones (id, userId, microphoneId, acquiredAt)
SELECT 
  gen_random_uuid(),
  u.id,
  (SELECT id FROM microphones WHERE isFree = true AND isAvailable = true ORDER BY id LIMIT 1),
  NOW()
FROM users u
LEFT JOIN user_microphones um ON u.id = um.userId
WHERE um.userId IS NULL
  AND EXISTS (SELECT 1 FROM microphones WHERE isFree = true AND isAvailable = true);

-- Step 4: Update users who don't have equipped avatars
UPDATE users 
SET equippedAvatarId = (SELECT id FROM avatars WHERE isFree = true AND isAvailable = true ORDER BY id LIMIT 1)
WHERE equippedAvatarId IS NULL
  AND EXISTS (SELECT 1 FROM avatars WHERE isFree = true AND isAvailable = true);

-- Step 5: Update users who don't have equipped microphones  
UPDATE users 
SET equippedMicrophoneId = (SELECT id FROM microphones WHERE isFree = true AND isAvailable = true ORDER BY id LIMIT 1)
WHERE equippedMicrophoneId IS NULL
  AND EXISTS (SELECT 1 FROM microphones WHERE isFree = true AND isAvailable = true);

-- Step 6: Show the results after fix
SELECT 
  'AFTER FIX:' as status,
  (SELECT COUNT(*) FROM users) as total_users_after,
  (SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_avatars ua ON u.id = ua.userId WHERE ua.userId IS NULL) as users_without_avatars_after,
  (SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_microphones um ON u.id = um.userId WHERE um.userId IS NULL) as users_without_microphones_after,
  (SELECT COUNT(*) FROM users WHERE equippedAvatarId IS NULL OR equippedMicrophoneId IS NULL) as users_without_equipped_items_after;

-- Step 7: Show a sample of users with their equipped items
SELECT 
  u.id,
  u.name,
  u.stageName,
  u.equippedAvatarId,
  a.name as avatar_name,
  u.equippedMicrophoneId,
  m.name as microphone_name
FROM users u
LEFT JOIN avatars a ON u.equippedAvatarId = a.id
LEFT JOIN microphones m ON u.equippedMicrophoneId = m.id
LIMIT 10;