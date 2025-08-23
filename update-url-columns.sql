-- Remove imageUrl column and update source column to TEXT type
-- Run this script against your MySQL database

USE karaokehub;

-- Remove imageUrl column since we only use source for CDN URLs
ALTER TABLE `shows` DROP COLUMN `imageUrl`;

-- Update source column to TEXT type to handle long CDN URLs
ALTER TABLE `shows` MODIFY COLUMN `source` TEXT;

-- Verify the changes
DESCRIBE `shows`;
