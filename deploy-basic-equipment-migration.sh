#!/bin/bash

# Deploy basic equipment migration to production database

echo "🎭 Equipping basic avatars and microphones for existing users..."

# Set production environment
export NODE_ENV=production

# Connect to production database and run the migration
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < equip-basic-items-for-existing-users.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully equipped basic items for existing users"
    echo "👥 All users now have basic avatar and microphone equipped"
    echo "🎤 This should fix the microphone display issue in friend modals"
else
    echo "❌ Failed to equip basic items for existing users"
    echo "Please check database connection and try again"
    exit 1
fi

echo "📝 Migration completed. New users will automatically get basic equipment on registration."