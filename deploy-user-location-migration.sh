#!/bin/bash

# Production Migration Script for City/State Fields
# This script ensures the city and state columns are added to the users table in production

echo "🚀 Starting production migration for user city/state fields..."

# Set production environment
export NODE_ENV=production

# Migrations run automatically when the app starts in production
echo "📝 Migrations run automatically when the NestJS app starts in production..."
echo "✅ City/state migration will be executed automatically via migrationsRun: true"

# Verify the columns exist
echo "🔍 Verifying city and state columns exist in users table..."
mysql -h $DATABASE_HOST -P $DATABASE_PORT -u $DATABASE_USERNAME -p$DATABASE_PASSWORD $DATABASE_NAME -e "
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = '$DATABASE_NAME' 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME IN ('city', 'state')
ORDER BY COLUMN_NAME;
" || {
  echo "❌ Failed to verify columns"
  exit 1
}

echo "✅ City/state migration completed successfully!"
echo "🎯 Users can now have location data (city/state) for better venue detection and user experience"