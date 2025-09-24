-- Fix user_avatars table unique constraint
-- Add the correct unique constraint for userId + avatarId combination
-- Keep the existing userId unique constraint for now to avoid breaking foreign keys

-- First, let's see if there are any duplicate userId+avatarId combinations
SELECT 'Checking for duplicate userId+avatarId combinations:' as status;
SELECT userId, avatarId, COUNT(*) as count 
FROM user_avatars 
GROUP BY userId, avatarId 
HAVING COUNT(*) > 1;

-- Add the correct unique constraint for userId + avatarId combination
ALTER TABLE user_avatars ADD UNIQUE KEY `unique_user_avatar_combo` (`userId`, `avatarId`);

-- Verify the fix
SELECT 'Added unique constraint for userId+avatarId combination' as status;
SHOW INDEX FROM user_avatars;