#!/bin/bash

# Quick fix for coin packages in production
# This script will update the production database to have exactly 5 coin packages

echo "🚀 Fixing coin packages in production database..."

# Set your project details here
PROJECT_ID="your-project-id"  # Replace with your actual project ID
INSTANCE_ID="your-instance-id"  # Replace with your actual Cloud SQL instance ID
DATABASE_NAME="karaokehub"
SQL_FILE="fix_coin_packages.sql"

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
gsutil mb -p $PROJECT_ID gs://$BUCKET_NAME 2>/dev/null || true

# Upload the file
gsutil cp $SQL_FILE gs://$BUCKET_NAME/

echo "📤 SQL file uploaded to gs://$BUCKET_NAME/$SQL_FILE"

# Import the SQL file to Cloud SQL
echo "🔄 Fixing coin packages in production database..."
gcloud sql import sql $INSTANCE_ID gs://$BUCKET_NAME/$SQL_FILE \
    --database=$DATABASE_NAME \
    --quiet

if [ $? -eq 0 ]; then
    echo "✅ Coin packages fixed successfully!"
    
    # Clean up the temporary file from Cloud Storage
    echo "🧹 Cleaning up temporary files..."
    gsutil rm gs://$BUCKET_NAME/$SQL_FILE
    
    echo ""
    echo "📊 You should now have exactly 5 coin packages:"
    echo "   1. Starter Pack - 100 coins - $0.99"
    echo "   2. Small Pack - 250 + 25 bonus coins - $1.99"  
    echo "   3. Medium Pack - 600 + 100 bonus coins - $4.99"
    echo "   4. Large Pack - 1300 + 300 bonus coins - $9.99"
    echo "   5. Mega Pack - 2800 + 700 bonus coins - $19.99"
    echo ""
    echo "🎉 Coin packages are now synchronized with local database!"
    
else
    echo "❌ Error: Coin package update failed"
    echo "Please check the Cloud SQL logs for more details"
    exit 1
fi

echo "🏁 Coin package fix completed."