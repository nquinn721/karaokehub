#!/bin/bash

# Manual Avatar Fix Script
# This script can be used to manually fix the Rockstar Alex data issue

echo "🎸 Manual Rockstar Alex Avatar Fix"
echo "================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script should be run from the KaraokeHub project root directory"
    exit 1
fi

echo "📋 This script will:"
echo "1. Connect to the production database"
echo "2. Fix 'Rockstar Alexa' name to 'Rockstar Alex'"
echo "3. Ensure correct image path: '/images/avatar/avatars/alex-rock.png'"
echo "4. Verify the changes"
echo ""

read -p "🤔 Do you want to proceed? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled"
    exit 0
fi

echo "🔧 Executing avatar fix..."

# Create a temporary SQL file
cat > /tmp/fix_rockstar_alex.sql << 'EOF'
-- Fix Rockstar Alex name discrepancy
USE `karaoke-hub`;

-- Show current state
SELECT '=== BEFORE FIXES ===' as status;
SELECT id, name, imageUrl FROM avatars WHERE name LIKE '%Rockstar%Alex%' OR name LIKE '%Rockstar%Alexa%';

-- Fix the name and image
UPDATE avatars 
SET name = 'Rockstar Alex',
    description = 'Rock star Alex with edgy attitude and leather jacket',
    imageUrl = '/images/avatar/avatars/alex-rock.png'
WHERE name = 'Rockstar Alexa' OR (name = 'Rockstar Alex' AND imageUrl != '/images/avatar/avatars/alex-rock.png');

-- Show final state
SELECT '=== AFTER FIXES ===' as status;
SELECT id, name, imageUrl FROM avatars WHERE name LIKE '%Rockstar%Alex%';

SELECT 'Fix completed!' as status;
EOF

echo "📁 Created temporary SQL fix file: /tmp/fix_rockstar_alex.sql"
echo ""
echo "🔗 To execute this fix, you can:"
echo "1. Connect to Cloud SQL manually:"
echo "   gcloud sql connect accountant --user=admin --database=karaoke-hub --project=heroic-footing-460117-k8"
echo ""
echo "2. Then run the SQL commands:"
echo "   source /tmp/fix_rockstar_alex.sql"
echo ""
echo "   OR copy and paste the SQL commands manually"
echo ""

# Show the SQL content for manual copy-paste
echo "📋 SQL Commands to run manually:"
echo "==============================="
cat /tmp/fix_rockstar_alex.sql
echo ""

echo "✅ Manual fix preparation completed!"
echo "💡 You can now execute the SQL commands in your Cloud SQL console"