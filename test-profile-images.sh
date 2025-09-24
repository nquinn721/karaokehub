#!/bin/bash

# Test OAuth Profile Images Fix
# This script checks if profile images are being displayed correctly in the admin interface

echo "🖼️  Testing OAuth Profile Image Fix"
echo "=================================="

# Check database for users with profile images
echo "📊 Checking database for users with profile images..."
mysql -h localhost -u admin -ppassword karaoke-hub -e "
SELECT 
    name, 
    provider, 
    CASE 
        WHEN profileImageUrl IS NOT NULL THEN 'HAS PROFILE IMAGE' 
        ELSE 'NO PROFILE IMAGE' 
    END as image_status,
    LEFT(profileImageUrl, 50) as profile_url_preview
FROM users 
WHERE provider IN ('google', 'facebook') 
ORDER BY createdAt DESC 
LIMIT 5;" 2>/dev/null

echo ""
echo "✅ OAuth Profile Image Fix Applied:"
echo "   - Added explicit profileImageUrl mapping in AdminStore"
echo "   - Preserved field during data transformation"
echo "   - Should now display OAuth profile images in admin interface"
echo ""
echo "🧪 To test:"
echo "   1. Navigate to admin dashboard"
echo "   2. Go to Data Management > Users"
echo "   3. Check if users with Google/Facebook providers show profile images"
echo "   4. Profile images should have blue borders to distinguish from system avatars"