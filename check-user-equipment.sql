-- Check current user equipment status
SELECT 
  id,
  username, 
  name,
  equippedAvatarId,
  equippedMicrophoneId,
  created_at,
  updated_at
FROM users 
WHERE username = 'NateDogg' OR name = 'NateDogg' OR username LIKE '%nate%';

-- Show all users and their equipment
SELECT 
  id,
  username, 
  name,
  equippedAvatarId,
  equippedMicrophoneId
FROM users 
ORDER BY created_at DESC 
LIMIT 10;