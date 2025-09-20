#!/bin/bash
# Sync Avatars and Microphones to Production Database
# This script will update production with 8 new avatars and 20 microphones

echo "🚀 Syncing avatars and microphones to production database..."

# Set your project details here - UPDATE THESE VALUES
PROJECT_ID="your-project-id"  # Replace with your actual project ID
INSTANCE_ID="your-instance-id"  # Replace with your actual Cloud SQL instance ID
DATABASE_NAME="karaokehub"
SQL_FILE="sync_avatars_microphones.sql"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    exit 1
fi

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: $SQL_FILE not found"
    exit 1
fi

echo "📁 Found SQL file: $SQL_FILE"

# Upload the SQL file to Cloud Storage temporarily
BUCKET_NAME="$PROJECT_ID-sql-imports"
echo "☁️  Uploading SQL file to Cloud Storage..."

# Create bucket if it doesn't exist
gsutil mb -p "$PROJECT_ID" "gs://$BUCKET_NAME" 2>/dev/null || true

# Upload the file
gsutil cp "$SQL_FILE" "gs://$BUCKET_NAME/"

echo "📤 SQL file uploaded to gs://$BUCKET_NAME/$SQL_FILE"

# Import the SQL file to Cloud SQL
echo "🔄 Syncing avatars and microphones to production database..."
if gcloud sql import sql "$INSTANCE_ID" "gs://$BUCKET_NAME/$SQL_FILE" \
    --database="$DATABASE_NAME" \
    --quiet; then
    
    echo "✅ Avatars and microphones synced successfully!"
    
    # Clean up the temporary file from Cloud Storage
    echo "🧹 Cleaning up temporary files..."
    gsutil rm "gs://$BUCKET_NAME/$SQL_FILE"
    
    echo ""
    echo "📊 Production database now has:" 
    echo "   ✨ 8 new avatars with updated URLs:"
    echo "      • Alex, Blake, Cameron, Joe (free)"
    echo "      • Juan, Kai (free)"  
    echo "      • Onyx, Tyler (premium - 100 coins each)"
    echo ""
    echo "   🎤 20 microphones across all rarities:"
    echo "      • 4 Basic (free)"
    echo "      • 4 Gold (100-180 coins)"
    echo "      • 4 Emerald (250-400 coins)"  
    echo "      • 4 Ruby (500-800 coins)"
    echo "      • 4 Diamond (1000-2000 coins)"
    echo ""
    echo "🎉 Production is now fully synced with local database!"
    
else
    echo "❌ Error: Avatar and microphone sync failed"
    echo "Please check the Cloud SQL logs for more details"
    exit 1
fi

echo "🏁 Avatar and microphone sync completed."