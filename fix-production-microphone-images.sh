#!/bin/bash

# Fix microphone image URLs in production database

echo "🔧 Fixing microphone image URLs in production database..."

# Set production environment
export NODE_ENV=production

# Connect to production database and run the fix
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < fix-microphone-images.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully updated microphone image URLs in production database"
    echo "🚀 Microphone images should now display correctly in friend modals"
else
    echo "❌ Failed to update microphone image URLs"
    echo "Please check database connection and try again"
    exit 1
fi

echo "📝 Deployment completed. Please test the friend modal on production to verify the fix."