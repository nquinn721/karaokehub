-- Manual migration script to fix production database issues
-- Run this directly on the production database

-- 1. Add profileImageUrl column to users table (from migration 1737462400000-AddProfileImageUrlToUsers.ts)
ALTER TABLE users ADD COLUMN profileImageUrl VARCHAR(255) NULL;

-- 2. Fix user_avatars constraint (from migration 1737462000000-FixUserAvatarsConstraints.ts)  
-- Drop the problematic unique constraint on userId only
ALTER TABLE user_avatars DROP INDEX IDX_8e1c8161ffe23571cc8e52fe7a;

-- 3. Fix existing user_avatars data (from migration 1737462100000-FixUserAvatarData.ts)
-- Set default avatarId for records with empty/null avatarId
UPDATE user_avatars 
SET avatarId = 'avatar-basic-male-1' 
WHERE avatarId IS NULL OR avatarId = '';

-- 4. Seed basic avatars (from migration 1737462200000-SeedAllNewAvatars.ts)
-- Insert basic avatars if they don't exist
INSERT IGNORE INTO avatars (id, name, description, imageUrl, price, category, isDefault, createdAt, updatedAt) VALUES
('avatar-basic-male-1', 'Basic Male', 'Default male avatar', 'https://storage.googleapis.com/karaoke-hub-assets/avatars/basic-male-1.png', 0, 'basic', 1, NOW(), NOW()),
('avatar-basic-female-1', 'Basic Female', 'Default female avatar', 'https://storage.googleapis.com/karaoke-hub-assets/avatars/basic-female-1.png', 0, 'basic', 1, NOW(), NOW()),
('avatar-basic-male-2', 'Basic Male 2', 'Alternative male avatar', 'https://storage.googleapis.com/karaoke-hub-assets/avatars/basic-male-2.png', 0, 'basic', 0, NOW(), NOW()),
('avatar-basic-female-2', 'Basic Female 2', 'Alternative female avatar', 'https://storage.googleapis.com/karaoke-hub-assets/avatars/basic-female-2.png', 0, 'basic', 0, NOW(), NOW());

-- 5. Record that migrations have been run
-- Insert migration records into the migrations table if it exists
INSERT IGNORE INTO migrations (timestamp, name) VALUES
(1737462000000, 'FixUserAvatarsConstraints1737462000000'),
(1737462100000, 'FixUserAvatarData1737462100000'), 
(1737462200000, 'SeedAllNewAvatars1737462200000'),
(1737462300000, 'EnsureProductionAvatarSystemReady1737462300000'),
(1737462400000, 'AddProfileImageUrlToUsers1737462400000');

-- Check results
SELECT 'Users table columns:' as info;
DESCRIBE users;

SELECT 'User avatars constraint check:' as info;
SHOW INDEXES FROM user_avatars;

SELECT 'Avatar count:' as info;
SELECT COUNT(*) as avatar_count FROM avatars;

SELECT 'Migration records:' as info;
SELECT * FROM migrations WHERE timestamp >= 1737462000000 ORDER BY timestamp;