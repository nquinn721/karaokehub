-- Fix user equipment for avatar and microphone display
-- This ensures users have default avatar and microphone equipped

-- Update users who don't have equipped avatar
UPDATE users 
SET equippedAvatarId = 'avatar_default_1' 
WHERE equippedAvatarId IS NULL OR equippedAvatarId = '';

-- Update users who don't have equipped microphone
UPDATE users 
SET equippedMicrophoneId = 'mic_default_1' 
WHERE equippedMicrophoneId IS NULL OR equippedMicrophoneId = '';

-- Verify the changes
SELECT id, username, name, equippedAvatarId, equippedMicrophoneId 
FROM users 
WHERE username = 'NateDogg' OR name = 'NateDogg';