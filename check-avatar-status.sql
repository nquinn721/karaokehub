-- Check current avatar and microphone data
-- First, check what avatars exist and which are free
SELECT id, name, isFree, isAvailable FROM avatars WHERE isAvailable = true ORDER BY id;

-- Check what microphones exist and which are free
SELECT id, name, isFree, isAvailable FROM microphones WHERE isAvailable = true ORDER BY id;

-- Check users who don't have any user_avatars records
SELECT u.id, u.name, u.stageName, u.equippedAvatarId, u.equippedMicrophoneId
FROM users u
LEFT JOIN user_avatars ua ON u.id = ua.userId
WHERE ua.userId IS NULL;

-- Check users who don't have any user_microphones records
SELECT u.id, u.name, u.stageName, u.equippedAvatarId, u.equippedMicrophoneId
FROM users u
LEFT JOIN user_microphones um ON u.id = um.userId
WHERE um.userId IS NULL;

-- Count total issues
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_avatars ua ON u.id = ua.userId WHERE ua.userId IS NULL) as users_without_avatars,
  (SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_microphones um ON u.id = um.userId WHERE um.userId IS NULL) as users_without_microphones,
  (SELECT COUNT(*) FROM users WHERE equippedAvatarId IS NULL OR equippedMicrophoneId IS NULL) as users_without_equipped_items;