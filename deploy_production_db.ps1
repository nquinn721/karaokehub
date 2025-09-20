# KaraokeHub Production Database Update Script (PowerShell)
# This script uploads the database update file to Google Cloud and executes it

Write-Host "🚀 Starting KaraokeHub production database update..." -ForegroundColor Green

# Set project and instance details - UPDATE THESE VALUES
$PROJECT_ID = "your-project-id"  # Replace with your actual project ID
$INSTANCE_ID = "your-instance-id"  # Replace with your actual Cloud SQL instance ID
$DATABASE_NAME = "karaokehub"
$SQL_FILE = "production_update_complete.sql"

# Check if gcloud is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: gcloud CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install gcloud CLI from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Check if SQL file exists
if (!(Test-Path $SQL_FILE)) {
    Write-Host "❌ Error: $SQL_FILE not found in current directory" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Found SQL file: $SQL_FILE" -ForegroundColor Cyan

# Check Google Cloud authentication
Write-Host "🔐 Checking Google Cloud authentication..." -ForegroundColor Cyan
$authCheck = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if ([string]::IsNullOrEmpty($authCheck)) {
    Write-Host "Please authenticate with Google Cloud first:" -ForegroundColor Yellow
    Write-Host "gcloud auth login" -ForegroundColor Yellow
    exit 1
}

# Set the project
Write-Host "🏗️  Setting Google Cloud project..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID

# Create a backup of the production database before updating
Write-Host "💾 Creating backup of production database..." -ForegroundColor Cyan
$BACKUP_NAME = "karaokehub-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
gcloud sql backups create `
    --instance=$INSTANCE_ID `
    --description="Backup before avatar/store system update" `
    --async

Write-Host "✅ Backup initiated: $BACKUP_NAME" -ForegroundColor Green

# Upload the SQL file to Cloud Storage temporarily
$BUCKET_NAME = "$PROJECT_ID-sql-imports"
Write-Host "☁️  Uploading SQL file to Cloud Storage..." -ForegroundColor Cyan

# Create bucket if it doesn't exist
gsutil mb -p $PROJECT_ID gs://$BUCKET_NAME 2>$null

# Upload the file
gsutil cp $SQL_FILE gs://$BUCKET_NAME/

Write-Host "📤 SQL file uploaded to gs://$BUCKET_NAME/$SQL_FILE" -ForegroundColor Green

# Import the SQL file to Cloud SQL
Write-Host "🔄 Executing SQL import on production database..." -ForegroundColor Cyan
$importResult = gcloud sql import sql $INSTANCE_ID gs://$BUCKET_NAME/$SQL_FILE `
    --database=$DATABASE_NAME `
    --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database update completed successfully!" -ForegroundColor Green
    
    # Clean up the temporary file from Cloud Storage
    Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Cyan
    gsutil rm gs://$BUCKET_NAME/$SQL_FILE
    
    Write-Host ""
    Write-Host "📊 Summary of changes applied:" -ForegroundColor Yellow
    Write-Host "   • Added avatars table with 8 avatar options" -ForegroundColor White
    Write-Host "   • Added user_avatars table for user avatar ownership" -ForegroundColor White
    Write-Host "   • Updated microphones table with coin pricing" -ForegroundColor White
    Write-Host "   • Added coin_packages table with 5 coin packages" -ForegroundColor White
    Write-Host "   • Added transactions table for store purchases" -ForegroundColor White
    Write-Host "   • Added coins column to users table" -ForegroundColor White
    Write-Host "   • Assigned default avatar (alex) to all existing users" -ForegroundColor White
    Write-Host "   • Assigned default microphone (mic_basic_1) to all existing users" -ForegroundColor White
    Write-Host "   • Gave all existing users 100 starting coins" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Production database is now ready for the new avatar and store systems!" -ForegroundColor Green
    
} else {
    Write-Host "❌ Error: Database import failed" -ForegroundColor Red
    Write-Host "Please check the Cloud SQL logs for more details" -ForegroundColor Yellow
    exit 1
}

Write-Host "🏁 Database update process completed." -ForegroundColor Green

# Instructions for manual execution
Write-Host ""
Write-Host "📋 IMPORTANT: Before running this script, please:" -ForegroundColor Yellow
Write-Host "1. Update the PROJECT_ID and INSTANCE_ID variables at the top of this script" -ForegroundColor White
Write-Host "2. Ensure you have the necessary permissions for Cloud SQL operations" -ForegroundColor White
Write-Host "3. Run this script from the KaraokeHub project directory" -ForegroundColor White
Write-Host ""
Write-Host "To execute this script:" -ForegroundColor Cyan
Write-Host "PowerShell -ExecutionPolicy Bypass -File deploy_production_db.ps1" -ForegroundColor White