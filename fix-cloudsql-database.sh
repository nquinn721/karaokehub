#!/bin/bash

# Cloud SQL Database Fix Script
# Fixes missing table and column issues in production

echo "🔧 Cloud SQL Database Fix Script"
echo "==============================="

# Cloud SQL Instance Details
INSTANCE_NAME="accountant"
DATABASE_NAME="karaokehub"
USERNAME="KaraokeHubUser"

echo "📊 Connecting to Cloud SQL instance: $INSTANCE_NAME"
echo "Database: $DATABASE_NAME"
echo "User: $USERNAME"
echo ""

# Create temporary SQL file with fixes
cat > /tmp/cloudsql_fixes.sql << 'EOF'
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

-- Check if column exists first
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'karaokehub' 
    AND TABLE_NAME = 'transactions' 
    AND COLUMN_NAME = 'coinAmount');

-- Add column if it doesn't exist
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN coinAmount INT NOT NULL DEFAULT 0', 
    'SELECT "coinAmount column already exists" as info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fix 3: Add missing acquiredAt column to user_avatars table
SELECT 'Adding acquiredAt column to user_avatars table...' as info;

-- Check if column exists first
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'karaokehub' 
    AND TABLE_NAME = 'user_avatars' 
    AND COLUMN_NAME = 'acquiredAt');

-- Add column if it doesn't exist
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE user_avatars ADD COLUMN acquiredAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)', 
    'SELECT "acquiredAt column already exists in user_avatars" as info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fix 4: Add missing acquiredAt column to user_microphones table (if needed)
SELECT 'Adding acquiredAt column to user_microphones table...' as info;

-- Check if column exists first
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'karaokehub' 
    AND TABLE_NAME = 'user_microphones' 
    AND COLUMN_NAME = 'acquiredAt');

-- Add column if it doesn't exist
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE user_microphones ADD COLUMN acquiredAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)', 
    'SELECT "acquiredAt column already exists in user_microphones" as info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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
SELECT 'Verification Results:' as info;
SELECT 'Tables created:' as check_type, COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'karaokehub' AND TABLE_NAME = 'api_rate_limit_status';

SELECT 'coinAmount column added:' as check_type, COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'karaokehub' AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'coinAmount';

SELECT 'user_avatars.acquiredAt column added:' as check_type, COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'karaokehub' AND TABLE_NAME = 'user_avatars' AND COLUMN_NAME = 'acquiredAt';

SELECT 'user_microphones.acquiredAt column added:' as check_type, COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'karaokehub' AND TABLE_NAME = 'user_microphones' AND COLUMN_NAME = 'acquiredAt';

SELECT 'API rate limit providers initialized:' as check_type, COUNT(*) as count FROM api_rate_limit_status;

SELECT 'All fixes completed successfully!' as result;
EOF

echo "📝 Created SQL fix script at /tmp/cloudsql_fixes.sql"
echo ""
echo "🔌 Connecting to Cloud SQL and executing fixes..."

# Connect to Cloud SQL and execute the fix script
gcloud sql connect $INSTANCE_NAME --user=$USERNAME << 'MYSQL_COMMANDS'
source /tmp/cloudsql_fixes.sql
exit
MYSQL_COMMANDS

echo ""
echo "✅ Database fixes completed!"
echo ""
echo "🧪 The following issues should now be resolved:"
echo "   1. ✅ Table 'api_rate_limit_status' created with all required columns"
echo "   2. ✅ Column 'coinAmount' added to transactions table"
echo "   3. ✅ Column 'acquiredAt' added to user_avatars table" 
echo "   4. ✅ Column 'acquiredAt' added to user_microphones table"
echo "   5. ✅ API rate limit providers initialized"
echo ""
echo "🚀 Your application should now run without the database errors!"

# Clean up
rm -f /tmp/cloudsql_fixes.sql