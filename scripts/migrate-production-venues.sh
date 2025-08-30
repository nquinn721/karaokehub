#!/bin/bash

# Production Database Migration Script for Venue-Show Separation
echo "🗄️ Running Production Database Migration for Venue-Show Separation"
echo "=================================================================="

# Configuration
PROJECT_ID="heroic-footing-460117-k8"
INSTANCE_CONNECTION_NAME="heroic-footing-460117-k8:us-central1:accountant"
DATABASE_NAME="karaoke-hub"

echo "⚠️  WARNING: This will modify the production database!"
echo "   Project: ${PROJECT_ID}"
echo "   Instance: ${INSTANCE_CONNECTION_NAME}"
echo "   Database: ${DATABASE_NAME}"
echo ""

# Confirm before proceeding
read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled."
    exit 1
fi

# Function to run SQL via Cloud SQL Proxy
run_sql_command() {
    local sql_file=$1
    echo "📊 Executing SQL migration: ${sql_file}"
    
    gcloud sql import sql ${INSTANCE_CONNECTION_NAME} ${sql_file} \
        --database=${DATABASE_NAME} \
        --project=${PROJECT_ID}
        
    if [ $? -eq 0 ]; then
        echo "✅ SQL migration completed successfully"
    else
        echo "❌ SQL migration failed"
        exit 1
    fi
}

# Function to backup database
backup_database() {
    local backup_name="venue-migration-backup-$(date +%Y%m%d-%H%M%S)"
    echo "💾 Creating database backup: ${backup_name}"
    
    gcloud sql export sql ${INSTANCE_CONNECTION_NAME} \
        gs://heroic-footing-460117-k8_backups/${backup_name}.sql \
        --database=${DATABASE_NAME} \
        --project=${PROJECT_ID}
        
    if [ $? -eq 0 ]; then
        echo "✅ Backup created successfully: ${backup_name}.sql"
    else
        echo "❌ Backup failed"
        exit 1
    fi
}

# Function to check current database state
check_database_state() {
    echo "🔍 Checking current database state..."
    
    # Create temporary check script
    cat > check_state.sql << 'EOF'
-- Check if venues table exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'NOT_EXISTS' 
    END as venues_table_status
FROM information_schema.tables 
WHERE table_schema = 'karaoke-hub' 
AND table_name = 'venues';

-- Check show counts
SELECT COUNT(*) as total_shows FROM shows WHERE isActive = 1;

-- Check if venueId column exists in shows
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'NOT_EXISTS' 
    END as venueId_column_status
FROM information_schema.columns 
WHERE table_schema = 'karaoke-hub' 
AND table_name = 'shows' 
AND column_name = 'venueId';
EOF

    gcloud sql import sql ${INSTANCE_CONNECTION_NAME} check_state.sql \
        --database=${DATABASE_NAME} \
        --project=${PROJECT_ID} || echo "Failed to check state"
    
    rm -f check_state.sql
}

# Main migration process
echo "🚀 Starting venue migration process..."

# Step 1: Check current state
check_database_state

# Step 2: Create backup
echo ""
read -p "Create database backup before migration? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    backup_database
fi

# Step 3: Upload and run migration SQL
echo ""
echo "📋 Uploading migration script to Cloud Storage..."

# Upload the venue migration SQL to Cloud Storage
gsutil cp scripts/venue-migration.sql gs://heroic-footing-460117-k8_cloudbuild/migrations/venue-migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration script uploaded successfully"
else
    echo "❌ Failed to upload migration script"
    exit 1
fi

# Step 4: Run the migration
echo ""
echo "⚡ Running venue migration..."
gcloud sql import sql ${INSTANCE_CONNECTION_NAME} \
    gs://heroic-footing-460117-k8_cloudbuild/migrations/venue-migration.sql \
    --database=${DATABASE_NAME} \
    --project=${PROJECT_ID}

if [ $? -eq 0 ]; then
    echo "✅ Venue migration completed successfully!"
else
    echo "❌ Venue migration failed!"
    exit 1
fi

# Step 5: Verify migration results
echo ""
echo "🔍 Verifying migration results..."

cat > verify_migration.sql << 'EOF'
-- Check venues created
SELECT 'Venues created:' as info, COUNT(*) as count FROM venues;

-- Check shows linked to venues
SELECT 'Shows linked to venues:' as info, COUNT(*) as count FROM shows WHERE venueId IS NOT NULL;

-- Check shows without venues
SELECT 'Active shows without venues:' as info, COUNT(*) as count FROM shows WHERE venueId IS NULL AND isActive = 1;

-- Sample venues
SELECT 'Sample venues:' as info;
SELECT id, name, address, city, state, 
       (SELECT COUNT(*) FROM shows WHERE venueId = venues.id) as show_count
FROM venues 
ORDER BY createdAt DESC 
LIMIT 5;
EOF

gsutil cp verify_migration.sql gs://heroic-footing-460117-k8_cloudbuild/migrations/verify-migration.sql

gcloud sql import sql ${INSTANCE_CONNECTION_NAME} \
    gs://heroic-footing-460117-k8_cloudbuild/migrations/verify-migration.sql \
    --database=${DATABASE_NAME} \
    --project=${PROJECT_ID}

rm -f verify_migration.sql

echo ""
echo "🎉 Production venue migration completed!"
echo "📊 Check the results above to ensure everything migrated correctly."
echo ""
echo "🔗 Next steps:"
echo "   1. Check the website to ensure maps show venue markers"
echo "   2. Test show submission with venue relationships"
echo "   3. Verify admin interface shows venues properly"
