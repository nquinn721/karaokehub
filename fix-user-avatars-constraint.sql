-- Fix user_avatars table unique constraint
-- The table currently has UNIQUE(userId) but should have UNIQUE(userId, avatarId)

-- Drop the incorrect unique constraint
ALTER TABLE user_avatars DROP INDEX IDX_8e1c8161ffe23571cc8e52fe7a;

-- Add the correct unique constraint for userId + avatarId combination
ALTER TABLE user_avatars ADD UNIQUE KEY `unique_user_avatar` (`userId`, `avatarId`);

-- Verify the fix
SELECT 'Fixed user_avatars unique constraint' as status;
SHOW CREATE TABLE user_avatars;