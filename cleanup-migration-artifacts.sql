-- Database Cleanup Script for Failed Migration Recovery
-- This script cleans up any leftover temporary tables and migration artifacts

USE `karaoke-hub`;

-- Set safe update mode off to allow cleanup
SET SQL_SAFE_UPDATES = 0;

-- Clean up any temporary tables that might exist from failed migrations
DROP TABLE IF EXISTS microphones_temp;
DROP TABLE IF EXISTS microphones_new;
DROP TABLE IF EXISTS microphones_backup;
DROP TEMPORARY TABLE IF EXISTS microphone_id_mapping;

-- Clean up any orphaned migration records for failed attempts
DELETE FROM migrations WHERE name LIKE '%Microphone%' AND timestamp > 1727906400000;

-- Show current state
SELECT 'CURRENT DATABASE STATE' as info;
SELECT 'Microphones table exists:' as info, 
       CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as status
FROM information_schema.tables 
WHERE table_schema = 'karaoke-hub' AND table_name = 'microphones';

SELECT 'Current microphones count:' as info, COUNT(*) as count FROM microphones;
SELECT 'Microphones with string IDs:' as info, COUNT(*) as count FROM microphones WHERE id LIKE 'mic_%';

SELECT 'Current avatars count:' as info, COUNT(*) as count FROM avatars;

-- Show any remaining temporary tables
SELECT 'Remaining temporary tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'karaoke-hub' 
  AND (table_name LIKE '%temp%' OR table_name LIKE '%new%' OR table_name LIKE '%backup%');

-- Reset safe update mode
SET SQL_SAFE_UPDATES = 1;

SELECT 'CLEANUP COMPLETED' as status;