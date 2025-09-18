#!/bin/bash

# Production Avatar Data Population Script
# This script ensures all users have avatar records and avatar items exist

echo "🎭 Setting up avatar data for production..."

# Database connection info
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-admin}
DB_PASS=${DB_PASS:-password}
DB_NAME=${DB_NAME:-karaoke-hub}

# Function to run SQL command
run_sql() {
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "$1"
}

echo "📊 Checking current avatar data..."

# Check if avatar items exist
MICROPHONE_COUNT=$(run_sql "SELECT COUNT(*) FROM microphones;" | tail -1)
OUTFIT_COUNT=$(run_sql "SELECT COUNT(*) FROM outfits;" | tail -1)
SHOES_COUNT=$(run_sql "SELECT COUNT(*) FROM shoes;" | tail -1)
USER_AVATAR_COUNT=$(run_sql "SELECT COUNT(*) FROM user_avatars;" | tail -1)
USER_COUNT=$(run_sql "SELECT COUNT(*) FROM users;" | tail -1)

echo "Current counts:"
echo "  Users: $USER_COUNT"
echo "  User Avatars: $USER_AVATAR_COUNT"
echo "  Microphones: $MICROPHONE_COUNT"
echo "  Outfits: $OUTFIT_COUNT"
echo "  Shoes: $SHOES_COUNT"

# Populate missing user avatars
if [ "$USER_AVATAR_COUNT" -lt "$USER_COUNT" ]; then
    echo "🔧 Creating missing user avatar records..."
    run_sql "
    INSERT IGNORE INTO user_avatars (id, userId, baseAvatarId, isActive, createdAt, updatedAt)
    SELECT 
        UUID() as id,
        u.id as userId,
        'avatar_1' as baseAvatarId,
        true as isActive,
        NOW() as createdAt,
        NOW() as updatedAt
    FROM users u
    LEFT JOIN user_avatars ua ON u.id = ua.userId
    WHERE ua.userId IS NULL;
    "
    echo "✅ User avatar records created"
else
    echo "✅ All users already have avatar records"
fi

echo "🎭 Avatar data setup complete!"
