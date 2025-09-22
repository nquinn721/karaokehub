-- Convert urls_to_parse table from integer ID to UUID

-- First, let's see current state
SELECT 'BEFORE UUID CONVERSION:' as info;
SELECT id, url, submittedBy FROM urls_to_parse LIMIT 5;

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

-- Show final result
SELECT 'AFTER UUID CONVERSION:' as info;
SELECT id, url, submittedBy FROM urls_to_parse LIMIT 5;

SELECT 'CONVERSION COMPLETE!' as info, COUNT(*) as url_count FROM urls_to_parse;