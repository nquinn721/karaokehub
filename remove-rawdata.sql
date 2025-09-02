-- Remove rawData column from parsed_schedules table
-- This script is part of removing the deprecated rawData field

-- Check if the column exists before dropping it
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'parsed_schedules' 
  AND COLUMN_NAME = 'rawData' 
  AND TABLE_SCHEMA = DATABASE();

-- Drop the rawData column if it exists
ALTER TABLE `parsed_schedules` DROP COLUMN IF EXISTS `rawData`;

-- Verify the column has been removed
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'parsed_schedules' 
  AND TABLE_SCHEMA = DATABASE();
