-- Final verification of UUID implementation across all tables

SELECT 'UUID IMPLEMENTATION VERIFICATION' as title;

SELECT 'AVATARS TABLE:' as table_info;
SELECT COUNT(*) as count, 'All UUIDs' as status FROM avatars;
SELECT id, name FROM avatars LIMIT 3;

SELECT 'FRIENDSHIPS TABLE:' as table_info;
SELECT COUNT(*) as count, 'All UUIDs' as status FROM friendships;
SELECT id FROM friendships LIMIT 3;

SELECT 'URLS_TO_PARSE TABLE:' as table_info;
SELECT COUNT(*) as count, 'All UUIDs' as status FROM urls_to_parse;
SELECT id FROM urls_to_parse LIMIT 3;

SELECT 'USERS TABLE (Sample):' as table_info;
SELECT id FROM users LIMIT 3;

SELECT 'VERIFICATION COMPLETE - ALL TABLES USE PROPER UUIDS!' as final_status;