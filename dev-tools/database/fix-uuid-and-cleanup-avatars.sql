-- Combined migration script to convert to UUIDs and clean up avatars

-- First, let's see current state
SELECT 'BEFORE MIGRATION - Current avatars:' as info;
SELECT id, name, image_url, rarity FROM avatars LIMIT 10;

-- Migration 1: Convert avatars table to UUID
-- Step 1: Create a temporary column for the new UUID
ALTER TABLE `avatars` ADD `new_id` varchar(36) NULL;

-- Step 2: Generate UUIDs for existing records
UPDATE `avatars` SET `new_id` = UUID();

-- Step 3: Update all foreign key references in user_avatars table
UPDATE `user_avatars` ua 
INNER JOIN `avatars` a ON ua.`avatarId` = a.`id` 
SET ua.`avatarId` = a.`new_id`;

-- Step 4: Update all foreign key references in transactions table (if exists)
UPDATE `transactions` t 
INNER JOIN `avatars` a ON t.`avatarId` = a.`id` 
SET t.`avatarId` = a.`new_id`
WHERE t.`avatarId` IS NOT NULL;

-- Step 5: Drop the old primary key and id column
ALTER TABLE `avatars` DROP PRIMARY KEY;
ALTER TABLE `avatars` DROP COLUMN `id`;

-- Step 6: Rename new_id to id and make it primary key
ALTER TABLE `avatars` CHANGE `new_id` `id` varchar(36) NOT NULL;
ALTER TABLE `avatars` ADD PRIMARY KEY (`id`);

SELECT 'STEP 1 COMPLETE: Converted avatars to UUID' as info;

-- Migration 2: Convert urls_to_parse table to UUID
-- Step 1: Create a temporary column for the new UUID
ALTER TABLE `urls_to_parse` ADD `new_id` varchar(36) NULL;

-- Step 2: Generate UUIDs for existing records
UPDATE `urls_to_parse` SET `new_id` = UUID();

-- Step 3: Drop the old primary key and auto_increment
ALTER TABLE `urls_to_parse` MODIFY `id` int NOT NULL;
ALTER TABLE `urls_to_parse` DROP PRIMARY KEY;
ALTER TABLE `urls_to_parse` DROP COLUMN `id`;

-- Step 4: Rename new_id to id and make it primary key
ALTER TABLE `urls_to_parse` CHANGE `new_id` `id` varchar(36) NOT NULL;
ALTER TABLE `urls_to_parse` ADD PRIMARY KEY (`id`);

SELECT 'STEP 2 COMPLETE: Converted urls_to_parse to UUID' as info;

-- Migration 3: Clean up avatar data
-- Clear all existing avatars
DELETE FROM `avatars`;

-- Insert the 8 real avatars with proper UUIDs
INSERT INTO `avatars` (
  `id`, `name`, `description`, `type`, `rarity`, 
  `imageUrl`, `price`, `coinPrice`, `isAvailable`, 
  `isFree`, `unlockLevel`, `createdAt`, `updatedAt`
) VALUES 
('a1234567-89ab-cdef-0123-456789abcdef', 'Alex', 'A common avatar', 'basic', 'common', '/images/avatar/avatars/alex.png', 0.00, 0, 1, 1, 1, NOW(), NOW()),
('b2345678-9abc-def0-1234-56789abcdef0', 'Blake', 'A common avatar', 'basic', 'common', '/images/avatar/avatars/blake.png', 0.00, 0, 1, 1, 1, NOW(), NOW()),
('c3456789-abcd-ef01-2345-6789abcdef01', 'Cameron', 'A common avatar', 'basic', 'common', '/images/avatar/avatars/cameron.png', 0.00, 0, 1, 1, 1, NOW(), NOW()),
('d4567890-bcde-f012-3456-789abcdef012', 'Joe', 'A common avatar', 'basic', 'common', '/images/avatar/avatars/joe.png', 0.00, 0, 1, 1, 1, NOW(), NOW()),
('e5678901-cdef-0123-4567-89abcdef0123', 'Juan', 'A common avatar', 'basic', 'common', '/images/avatar/avatars/juan.png', 0.00, 0, 1, 1, 1, NOW(), NOW()),
('f6789012-def0-1234-5678-9abcdef01234', 'Kai', 'A common avatar', 'basic', 'common', '/images/avatar/avatars/kai.png', 0.00, 0, 1, 1, 1, NOW(), NOW()),
('a7890123-ef01-2345-6789-abcdef012345', 'Onyx', 'An uncommon avatar', 'basic', 'uncommon', '/images/avatar/avatars/onyx.png', 0.00, 100, 1, 0, 1, NOW(), NOW()),
('b8901234-f012-3456-789a-bcdef0123456', 'Tyler', 'An uncommon avatar', 'basic', 'uncommon', '/images/avatar/avatars/tyler.png', 0.00, 100, 1, 0, 1, NOW(), NOW());

SELECT 'STEP 3 COMPLETE: Cleaned up avatar data' as info;

-- Show final result
SELECT 'AFTER MIGRATION - Final avatars:' as info;
SELECT id, name, image_url, rarity, is_free, coin_price FROM avatars ORDER BY name;

SELECT 'MIGRATION COMPLETE!' as info, COUNT(*) as avatar_count FROM avatars;