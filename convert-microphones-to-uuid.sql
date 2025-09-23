-- Convert Microphones Table to UUID IDs
-- This script converts the microphones table from custom string IDs to proper UUIDs
-- while preserving all data and updating foreign key references

-- Step 1: Check current microphone data
SELECT 'Current microphones before conversion:' as step;
SELECT id, name, type, rarity FROM microphones ORDER BY id LIMIT 10;

-- Step 2: Check foreign key references
SELECT 'Users with equipped microphones:' as step;
SELECT COUNT(*) as users_with_mics FROM users WHERE equippedMicrophoneId IS NOT NULL;

SELECT 'User microphones records:' as step;
SELECT COUNT(*) as user_mic_records FROM user_microphones;

SELECT 'Transactions with microphones:' as step;
SELECT COUNT(*) as transaction_records FROM transactions WHERE microphoneId IS NOT NULL;

-- Step 3: Disable foreign key checks for conversion
SET foreign_key_checks = 0;

-- Step 4: Create temporary table with UUID structure
CREATE TABLE microphones_temp (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  type ENUM('basic', 'vintage', 'modern', 'wireless', 'premium', 'golden') NOT NULL DEFAULT 'basic',
  rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
  imageUrl VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  coinPrice INT NOT NULL DEFAULT 0,
  isAvailable TINYINT(1) NOT NULL DEFAULT 1,
  isFree TINYINT(1) NOT NULL DEFAULT 0,
  isUnlockable TINYINT(1) NOT NULL DEFAULT 0,
  unlockRequirement VARCHAR(255) NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

-- Step 5: Insert data with new UUIDs
INSERT INTO microphones_temp (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable, isFree, isUnlockable, unlockRequirement, createdAt, updatedAt)
SELECT 
  UUID() as id,
  name,
  description,
  type,
  rarity,
  imageUrl,
  price,
  coinPrice,
  isAvailable,
  isFree,
  isUnlockable,
  unlockRequirement,
  createdAt,
  updatedAt
FROM microphones;

-- Step 6: Create mapping table for ID conversion
CREATE TEMPORARY TABLE microphone_id_mapping AS
SELECT 
  old_mic.id as old_id,
  new_mic.id as new_id,
  old_mic.name as mic_name
FROM microphones old_mic
JOIN microphones_temp new_mic ON old_mic.name = new_mic.name
ORDER BY old_mic.id;

-- Step 7: Show the mapping
SELECT 'ID Mapping created:' as step;
SELECT old_id, new_id, mic_name FROM microphone_id_mapping ORDER BY old_id LIMIT 10;

-- Step 8: Update users table foreign keys
UPDATE users u
JOIN microphone_id_mapping m ON u.equippedMicrophoneId = m.old_id
SET u.equippedMicrophoneId = m.new_id
WHERE u.equippedMicrophoneId IS NOT NULL;

-- Step 9: Update user_microphones table foreign keys
UPDATE user_microphones um
JOIN microphone_id_mapping m ON um.microphoneId = m.old_id
SET um.microphoneId = m.new_id;

-- Step 10: Update transactions table foreign keys (if any)
UPDATE transactions t
JOIN microphone_id_mapping m ON t.microphoneId = m.old_id
SET t.microphoneId = m.new_id
WHERE t.microphoneId IS NOT NULL;

-- Step 11: Drop old table and rename temp table
DROP TABLE microphones;
RENAME TABLE microphones_temp TO microphones;

-- Step 12: Re-enable foreign key checks
SET foreign_key_checks = 1;

-- Step 13: Verify conversion
SELECT 'Conversion completed. New microphone data:' as step;
SELECT id, name, type, rarity FROM microphones ORDER BY name LIMIT 10;

SELECT 'Updated foreign key references:' as step;
SELECT 'Users with equipped microphones' as table_name, COUNT(*) as count FROM users WHERE equippedMicrophoneId IS NOT NULL
UNION ALL
SELECT 'User microphones records' as table_name, COUNT(*) as count FROM user_microphones
UNION ALL  
SELECT 'Transaction records with microphones' as table_name, COUNT(*) as count FROM transactions WHERE microphoneId IS NOT NULL;

SELECT 'Sample UUID format verification:' as step;
SELECT id, name FROM microphones WHERE id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' LIMIT 5;