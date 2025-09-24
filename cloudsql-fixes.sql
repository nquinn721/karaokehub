-- Cloud SQL Database Fixes
-- Run these commands in your MySQL terminal

-- Switch to the correct database
USE karaokehub;

-- Check current database
SELECT 'Current database:' as info, DATABASE() as database_name;

-- Fix 1: Create missing api_rate_limit_status table
SELECT 'Creating api_rate_limit_status table...' as info;

CREATE TABLE IF NOT EXISTS api_rate_limit_status (
    provider ENUM('itunes', 'spotify', 'youtube', 'google', 'facebook', 'twitter', 'gemini') NOT NULL PRIMARY KEY,
    max_requests_per_minute INT NOT NULL DEFAULT 300,
    current_minute_count INT NOT NULL DEFAULT 0,
    current_minute_start DATETIME NULL,
    is_rate_limited BOOLEAN NOT NULL DEFAULT FALSE,
    circuit_breaker_open BOOLEAN NOT NULL DEFAULT FALSE,
    last_request_at TIMESTAMP(3) NULL,
    last_success_at TIMESTAMP(3) NULL,
    last_error_at TIMESTAMP(3) NULL,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

-- Fix 2: Add missing coinAmount column to transactions table
SELECT 'Adding coinAmount column to transactions table...' as info;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS coinAmount INT NOT NULL DEFAULT 0;

-- Fix 3: Add missing acquiredAt column to user_avatars table
SELECT 'Adding acquiredAt column to user_avatars table...' as info;

ALTER TABLE user_avatars ADD COLUMN IF NOT EXISTS acquiredAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);

-- Fix 4: Add missing acquiredAt column to user_microphones table
SELECT 'Adding acquiredAt column to user_microphones table...' as info;

ALTER TABLE user_microphones ADD COLUMN IF NOT EXISTS acquiredAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);

-- Initialize api_rate_limit_status table with default values
SELECT 'Initializing api_rate_limit_status with default providers...' as info;

INSERT IGNORE INTO api_rate_limit_status (provider) VALUES 
('itunes'),
('spotify'), 
('youtube'),
('google'),
('facebook'),
('twitter'),
('gemini');

-- Verification queries
SELECT '=== VERIFICATION RESULTS ===' as section;

SELECT 'api_rate_limit_status table exists:' as check_type, COUNT(*) as count 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'karaokehub' AND TABLE_NAME = 'api_rate_limit_status';

SELECT 'transactions.coinAmount column exists:' as check_type, COUNT(*) as count 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'karaokehub' AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'coinAmount';

SELECT 'user_avatars.acquiredAt column exists:' as check_type, COUNT(*) as count 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'karaokehub' AND TABLE_NAME = 'user_avatars' AND COLUMN_NAME = 'acquiredAt';

SELECT 'user_microphones.acquiredAt column exists:' as check_type, COUNT(*) as count 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'karaokehub' AND TABLE_NAME = 'user_microphones' AND COLUMN_NAME = 'acquiredAt';

SELECT 'API rate limit providers count:' as check_type, COUNT(*) as count 
FROM api_rate_limit_status;

SELECT '✅ ALL FIXES COMPLETED SUCCESSFULLY!' as result;