-- Migration to equip basic avatar and microphone for existing users who don't have them
-- This ensures all users in production have basic equipment

-- Set default avatar (avatar_1 - Alex) for users without an equipped avatar
UPDATE users 
SET equippedAvatarId = 'avatar_1' 
WHERE equippedAvatarId IS NULL 
  AND isActive = 1
  AND EXISTS (SELECT 1 FROM avatars WHERE id = 'avatar_1');

-- Set default microphone (first basic microphone) for users without an equipped microphone
UPDATE users 
SET equippedMicrophoneId = (
  SELECT id FROM microphones 
  WHERE name = 'Basic Mic Silver' 
    AND type = 'basic' 
    AND rarity = 'common' 
  LIMIT 1
)
WHERE equippedMicrophoneId IS NULL 
  AND isActive = 1;

-- Create user_avatars records for users who now have avatar_1 equipped but don't own it
INSERT INTO user_avatars (id, userId, avatarId, purchaseDate, equipDate)
SELECT 
  UUID() as id,
  u.id as userId,
  'avatar_1' as avatarId,
  u.createdAt as purchaseDate,
  NOW() as equipDate
FROM users u
WHERE u.equippedAvatarId = 'avatar_1'
  AND u.isActive = 1
  AND NOT EXISTS (
    SELECT 1 FROM user_avatars ua 
    WHERE ua.userId = u.id AND ua.avatarId = 'avatar_1'
  );

-- Create user_microphones records for users who now have a basic microphone equipped but don't own it
INSERT INTO user_microphones (id, userId, microphoneId, purchaseDate, equipDate)
SELECT 
  UUID() as id,
  u.id as userId,
  u.equippedMicrophoneId as microphoneId,
  u.createdAt as purchaseDate,
  NOW() as equipDate
FROM users u
WHERE u.equippedMicrophoneId IS NOT NULL
  AND u.isActive = 1
  AND NOT EXISTS (
    SELECT 1 FROM user_microphones um 
    WHERE um.userId = u.id AND um.microphoneId = u.equippedMicrophoneId
  );

-- Show results
SELECT 
  COUNT(*) as total_users,
  COUNT(equippedAvatarId) as users_with_avatar,
  COUNT(equippedMicrophoneId) as users_with_microphone
FROM users 
WHERE isActive = 1;