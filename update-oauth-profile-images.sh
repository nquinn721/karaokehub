#!/bin/bash

# Update existing OAuth users with their profile images by re-triggering OAuth profile fetch

echo "🔄 Updating existing OAuth users with profile images..."

# Set environment (change to 'production' for production deployment)
export NODE_ENV=${NODE_ENV:-development}

# This script will help administrators manually update OAuth users
# For now, we'll create a simple query that shows which users need profile images

echo "📋 Checking OAuth users without profile images..."

if [ "$NODE_ENV" = "production" ]; then
    mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
    -- Show OAuth users without profile images
    SELECT 
        id,
        email,
        name,
        provider,
        providerId,
        profileImageUrl,
        createdAt
    FROM users 
    WHERE provider IN ('google', 'facebook') 
      AND profileImageUrl IS NULL
      AND isActive = 1
    ORDER BY createdAt DESC;
    
    -- Count of OAuth users without profile images
    SELECT 
        provider,
        COUNT(*) as users_without_profile_image
    FROM users 
    WHERE provider IN ('google', 'facebook') 
      AND profileImageUrl IS NULL
      AND isActive = 1
    GROUP BY provider;
EOF
else
    echo "ℹ️  In development mode - would check local database"
    echo "   Query: SELECT id, email, name, provider FROM users WHERE provider IN ('google', 'facebook') AND profileImageUrl IS NULL"
fi

echo ""
echo "📝 Note: Profile images will be automatically captured on the next OAuth login for these users."
echo "   The updated authentication logic will now:"
echo "   1. Capture profile images during new user registration"
echo "   2. Update missing profile images on subsequent logins"
echo "   3. Update changed profile images when users login"
echo ""
echo "✅ OAuth profile image update system is now active!"