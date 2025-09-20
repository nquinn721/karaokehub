#!/bin/bash

# KaraokeHub Production Database Update Script
# This script uploads the database update file to Google Cloud and executes it

echo "🚀 Starting KaraokeHub production database update..."

# Set project and instance details
PROJECT_ID="your-project-id"  # Replace with your actual project ID
INSTANCE_ID="your-instance-id"  # Replace with your actual Cloud SQL instance ID
DATABASE_NAME="karaokehub"
SQL_FILE="production_update_complete.sql"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed or not in PATH"
    echo "Please install gcloud CLI from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: $SQL_FILE not found in current directory"
    exit 1
fi

echo "📁 Found SQL file: $SQL_FILE"

# Authenticate with Google Cloud (if needed)
echo "🔐 Checking Google Cloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "Please authenticate with Google Cloud first:"
    echo "gcloud auth login"
    exit 1
fi

# Set the project
echo "🏗️  Setting Google Cloud project..."
gcloud config set project $PROJECT_ID

# Create a backup of the production database before updating
echo "💾 Creating backup of production database..."
BACKUP_NAME="karaokehub-backup-$(date +%Y%m%d-%H%M%S)"
gcloud sql backups create \
    --instance=$INSTANCE_ID \
    --description="Backup before avatar/store system update" \
    --async

echo "✅ Backup initiated: $BACKUP_NAME"

# Upload the SQL file to Cloud Storage temporarily
BUCKET_NAME="$PROJECT_ID-sql-imports"
echo "☁️  Uploading SQL file to Cloud Storage..."

# Create bucket if it doesn't exist
gsutil mb -p $PROJECT_ID gs://$BUCKET_NAME 2>/dev/null || true

# Upload the file
gsutil cp $SQL_FILE gs://$BUCKET_NAME/

echo "📤 SQL file uploaded to gs://$BUCKET_NAME/$SQL_FILE"

# Import the SQL file to Cloud SQL
echo "🔄 Executing SQL import on production database..."
gcloud sql import sql $INSTANCE_ID gs://$BUCKET_NAME/$SQL_FILE \
    --database=$DATABASE_NAME \
    --quiet

if [ $? -eq 0 ]; then
    echo "✅ Database update completed successfully!"
    
    # Clean up the temporary file from Cloud Storage
    echo "🧹 Cleaning up temporary files..."
    gsutil rm gs://$BUCKET_NAME/$SQL_FILE
    
    echo ""
    echo "📊 Summary of changes applied:"
    echo "   • Added avatars table with 8 avatar options"
    echo "   • Added user_avatars table for user avatar ownership"
    echo "   • Updated microphones table with coin pricing"
    echo "   • Added coin_packages table with 5 coin packages"
    echo "   • Added transactions table for store purchases"
    echo "   • Added coins column to users table"
    echo "   • Assigned default avatar (alex) to all existing users"
    echo "   • Assigned default microphone (mic_basic_1) to all existing users"
    echo "   • Gave all existing users 100 starting coins"
    echo ""
    echo "🎉 Production database is now ready for the new avatar and store systems!"
    
else
    echo "❌ Error: Database import failed"
    echo "Please check the Cloud SQL logs for more details"
    exit 1
fi

echo "🏁 Database update process completed."