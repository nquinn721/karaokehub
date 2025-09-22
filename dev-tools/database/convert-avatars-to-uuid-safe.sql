-- Convert avatar IDs to UUIDs (handling foreign key constraints)

-- First, let's see current state
SELECT 'BEFORE UUID CONVERSION:' as info;
SELECT id, name, imageUrl, rarity FROM avatars ORDER BY name;

-- Step 1: Drop the foreign key constraint temporarily
ALTER TABLE `users` DROP FOREIGN KEY `FK_7101087f4cf7f7cf50c0389e694`;

-- Step 2: Create a temporary column for the new UUID
ALTER TABLE `avatars` ADD `new_id` varchar(36) NULL;

-- Step 3: Generate UUIDs for existing records
UPDATE `avatars` SET `new_id` = UUID();

-- Step 4: Update all foreign key references in user_avatars table
UPDATE `user_avatars` ua 
INNER JOIN `avatars` a ON ua.`avatarId` = a.`id` 
SET ua.`avatarId` = a.`new_id`;

-- Step 5: Update all foreign key references in users table
UPDATE `users` u 
INNER JOIN `avatars` a ON u.`equippedAvatarId` = a.`id` 
SET u.`equippedAvatarId` = a.`new_id`
WHERE u.`equippedAvatarId` IS NOT NULL;

-- Step 6: Update all foreign key references in transactions table (if exists)
UPDATE `transactions` t 
INNER JOIN `avatars` a ON t.`avatarId` = a.`id` 
SET t.`avatarId` = a.`new_id`
WHERE t.`avatarId` IS NOT NULL;

-- Step 7: Drop the old primary key and id column
ALTER TABLE `avatars` DROP PRIMARY KEY;
ALTER TABLE `avatars` DROP COLUMN `id`;

-- Step 8: Rename new_id to id and make it primary key
ALTER TABLE `avatars` CHANGE `new_id` `id` varchar(36) NOT NULL;
ALTER TABLE `avatars` ADD PRIMARY KEY (`id`);

-- Step 9: Recreate the foreign key constraint
ALTER TABLE `users` ADD CONSTRAINT `FK_7101087f4cf7f7cf50c0389e694` 
FOREIGN KEY (`equippedAvatarId`) REFERENCES `avatars` (`id`);

-- Show final result
SELECT 'AFTER UUID CONVERSION:' as info;
SELECT id, name, imageUrl, rarity, isFree, coinPrice FROM avatars ORDER BY name;

SELECT 'CONVERSION COMPLETE!' as info, COUNT(*) as avatar_count FROM avatars;