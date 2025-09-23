-- Production Database Migration Script
-- This script fixes the critical avatar and microphone system issues

USE `karaoke-hub`;

-- Step 1: Check current state
SELECT 'CHECKING CURRENT STATE' as step;
SELECT 'Avatars count:' as info, COUNT(*) as count FROM avatars;
SELECT 'Microphones count:' as info, COUNT(*) as count FROM microphones;
SELECT 'Microphones with string IDs:' as info, COUNT(*) as count FROM microphones WHERE id LIKE 'mic_%';
SELECT 'User avatars count:' as info, COUNT(*) as count FROM user_avatars;

-- Step 2: Populate avatars table if empty
SELECT 'POPULATING AVATARS TABLE' as step;
INSERT IGNORE INTO avatars (id, name, imageUrl, category, is_premium, coin_cost, created_at, updated_at) VALUES
(UUID(), 'Classic Singer', '/avatars/classic-singer.png', 'classic', false, 0, NOW(), NOW()),
(UUID(), 'Rock Star', '/avatars/rock-star.png', 'rock', false, 0, NOW(), NOW()),
(UUID(), 'Jazz Musician', '/avatars/jazz-musician.png', 'jazz', false, 0, NOW(), NOW()),
(UUID(), 'Pop Icon', '/avatars/pop-icon.png', 'pop', true, 50, NOW(), NOW()),
(UUID(), 'Country Star', '/avatars/country-star.png', 'country', true, 50, NOW(), NOW()),
(UUID(), 'Hip Hop Artist', '/avatars/hip-hop-artist.png', 'hip-hop', true, 75, NOW(), NOW()),
(UUID(), 'Opera Singer', '/avatars/opera-singer.png', 'opera', true, 100, NOW(), NOW()),
(UUID(), 'DJ Master', '/avatars/dj-master.png', 'electronic', true, 100, NOW(), NOW());

SELECT 'Avatars after population:' as info, COUNT(*) as count FROM avatars;

-- Step 3: Populate microphones table if needed
SELECT 'POPULATING MICROPHONES TABLE' as step;

-- First check if we need to convert existing microphones or create new ones
SET @mic_count = (SELECT COUNT(*) FROM microphones);

-- If we have microphones with string IDs, convert them
SET @string_mic_count = (SELECT COUNT(*) FROM microphones WHERE id LIKE 'mic_%');

-- Convert existing string IDs to UUIDs if needed
SET foreign_key_checks = 0;

-- Create temporary mapping table
DROP TEMPORARY TABLE IF EXISTS microphone_id_mapping;
CREATE TEMPORARY TABLE microphone_id_mapping (
  old_id VARCHAR(255),
  new_id VARCHAR(36),
  name VARCHAR(255)
);

-- If we have string microphones, convert them
IF @string_mic_count > 0 THEN
  -- Create mapping for existing microphones
  INSERT INTO microphone_id_mapping (old_id, new_id, name)
  SELECT id, UUID(), name FROM microphones WHERE id LIKE 'mic_%';
  
  -- Create new microphones table with UUIDs
  CREATE TABLE microphones_new (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    coin_cost INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
  
  -- Insert converted data
  INSERT INTO microphones_new (id, name, image_url, category, is_premium, coin_cost, created_at, updated_at)
  SELECT 
    m.new_id,
    old_m.name,
    old_m.image_url,
    old_m.category,
    old_m.is_premium,
    old_m.coin_cost,
    old_m.created_at,
    old_m.updated_at
  FROM microphones old_m
  JOIN microphone_id_mapping m ON old_m.id = m.old_id;
  
  -- Update user_avatars references
  UPDATE user_avatars ua
  JOIN microphone_id_mapping m ON ua.microphone_id = m.old_id
  SET ua.microphone_id = m.new_id;
  
  -- Drop old table and rename new one
  DROP TABLE microphones;
  RENAME TABLE microphones_new TO microphones;
  
END IF;

-- If microphones table is empty or has very few entries, populate with defaults
IF @mic_count < 8 THEN
  INSERT IGNORE INTO microphones (id, name, image_url, category, is_premium, coin_cost, created_at, updated_at) VALUES
  (UUID(), 'Basic Mic 1', '/microphones/basic-1.png', 'basic', false, 0, NOW(), NOW()),
  (UUID(), 'Basic Mic 2', '/microphones/basic-2.png', 'basic', false, 0, NOW(), NOW()),
  (UUID(), 'Basic Mic 3', '/microphones/basic-3.png', 'basic', false, 0, NOW(), NOW()),
  (UUID(), 'Vintage Mic 1', '/microphones/vintage-1.png', 'vintage', true, 25, NOW(), NOW()),
  (UUID(), 'Vintage Mic 2', '/microphones/vintage-2.png', 'vintage', true, 25, NOW(), NOW()),
  (UUID(), 'Vintage Mic 3', '/microphones/vintage-3.png', 'vintage', true, 30, NOW(), NOW()),
  (UUID(), 'Modern Mic 1', '/microphones/modern-1.png', 'modern', true, 40, NOW(), NOW()),
  (UUID(), 'Modern Mic 2', '/microphones/modern-2.png', 'modern', true, 45, NOW(), NOW()),
  (UUID(), 'Modern Mic 3', '/microphones/modern-3.png', 'modern', true, 50, NOW(), NOW()),
  (UUID(), 'Wireless Mic 1', '/microphones/wireless-1.png', 'wireless', true, 60, NOW(), NOW()),
  (UUID(), 'Wireless Mic 2', '/microphones/wireless-2.png', 'wireless', true, 70, NOW(), NOW()),
  (UUID(), 'Wireless Mic 3', '/microphones/wireless-3.png', 'wireless', true, 80, NOW(), NOW());
END IF;

SET foreign_key_checks = 1;

-- Step 4: Final verification
SELECT 'FINAL VERIFICATION' as step;
SELECT 'Final avatars count:' as info, COUNT(*) as count FROM avatars;
SELECT 'Final microphones count:' as info, COUNT(*) as count FROM microphones;
SELECT 'Microphones with string IDs remaining:' as info, COUNT(*) as count FROM microphones WHERE id LIKE 'mic_%';
SELECT 'User avatars count:' as info, COUNT(*) as count FROM user_avatars;

-- Show sample data
SELECT 'Sample avatars:' as info;
SELECT id, name, category, is_premium, coin_cost FROM avatars LIMIT 5;

SELECT 'Sample microphones:' as info;
SELECT id, name, category, is_premium, coin_cost FROM microphones LIMIT 5;

SELECT 'MIGRATION COMPLETED SUCCESSFULLY!' as status;