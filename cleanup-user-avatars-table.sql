-- Clean up user_avatars table structure
-- Remove redundant and incorrect fields

-- Step 1: Check current data
SELECT 'CURRENT user_avatars STRUCTURE:' as info;
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT userId) as unique_users,
  COUNT(DISTINCT avatarId) as unique_avatar_ids,
  COUNT(DISTINCT baseAvatarId) as unique_base_avatar_ids,
  SUM(CASE WHEN microphoneId IS NOT NULL THEN 1 ELSE 0 END) as records_with_microphone
FROM user_avatars;

-- Step 2: Show sample data to understand the redundancy
SELECT 'SAMPLE DATA:' as info;
SELECT userId, avatarId, baseAvatarId, microphoneId FROM user_avatars LIMIT 5;

-- Step 3: Check if avatarId and baseAvatarId are the same (they should be)
SELECT 'CHECKING IF avatarId = baseAvatarId:' as info;
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN avatarId = baseAvatarId THEN 1 ELSE 0 END) as matching,
  SUM(CASE WHEN avatarId != baseAvatarId THEN 1 ELSE 0 END) as different
FROM user_avatars;

-- Step 4: Remove the microphoneId column (microphones should be in user_microphones table)
ALTER TABLE user_avatars DROP COLUMN microphoneId;

-- Step 5: Remove the redundant avatarId column (keep baseAvatarId)
ALTER TABLE user_avatars DROP COLUMN avatarId;

-- Step 6: Rename baseAvatarId to avatarId for clarity
ALTER TABLE user_avatars CHANGE COLUMN baseAvatarId avatarId varchar(255) NOT NULL;

-- Step 7: Show final structure
SELECT 'FINAL user_avatars STRUCTURE:' as info;
DESCRIBE user_avatars;