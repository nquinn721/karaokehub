# Sync Avatars and Microphones to Production Database (PowerShell)
# This script will update production with 8 new avatars and 20 microphones

Write-Host "🚀 Syncing avatars and microphones to production database..." -ForegroundColor Green

# Set your project details here - UPDATE THESE VALUES
$PROJECT_ID = "your-project-id"  # Replace with your actual project ID
$INSTANCE_ID = "your-instance-id"  # Replace with your actual Cloud SQL instance ID
$DATABASE_NAME = "karaokehub"
$SQL_FILE = "sync_avatars_microphones.sql"

# Check if gcloud is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: gcloud CLI is not installed" -ForegroundColor Red
    exit 1
}

# Check if SQL file exists
if (!(Test-Path $SQL_FILE)) {
    Write-Host "❌ Error: $SQL_FILE not found" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Found SQL file: $SQL_FILE" -ForegroundColor Cyan

# Upload the SQL file to Cloud Storage temporarily
$BUCKET_NAME = "$PROJECT_ID-sql-imports"
Write-Host "☁️  Uploading SQL file to Cloud Storage..." -ForegroundColor Cyan

# Create bucket if it doesn't exist
gsutil mb -p $PROJECT_ID gs://$BUCKET_NAME 2>$null

# Upload the file
gsutil cp $SQL_FILE gs://$BUCKET_NAME/

Write-Host "📤 SQL file uploaded to gs://$BUCKET_NAME/$SQL_FILE" -ForegroundColor Green

# Import the SQL file to Cloud SQL
Write-Host "🔄 Syncing avatars and microphones to production database..." -ForegroundColor Cyan
$importResult = gcloud sql import sql $INSTANCE_ID gs://$BUCKET_NAME/$SQL_FILE `
    --database=$DATABASE_NAME `
    --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Avatars and microphones synced successfully!" -ForegroundColor Green
    
    # Clean up the temporary file from Cloud Storage
    Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Cyan
    gsutil rm gs://$BUCKET_NAME/$SQL_FILE
    
    Write-Host ""
    Write-Host "📊 Production database now has:" -ForegroundColor Yellow
    Write-Host "   ✨ 8 new avatars with updated URLs:" -ForegroundColor White
    Write-Host "      • Alex, Blake, Cameron, Joe (free)" -ForegroundColor White
    Write-Host "      • Juan, Kai (free)" -ForegroundColor White
    Write-Host "      • Onyx, Tyler (premium - 100 coins each)" -ForegroundColor White
    Write-Host ""
    Write-Host "   🎤 20 microphones across all rarities:" -ForegroundColor White
    Write-Host "      • 4 Basic (free)" -ForegroundColor White
    Write-Host "      • 4 Gold (100-180 coins)" -ForegroundColor White
    Write-Host "      • 4 Emerald (250-400 coins)" -ForegroundColor White
    Write-Host "      • 4 Ruby (500-800 coins)" -ForegroundColor White
    Write-Host "      • 4 Diamond (1000-2000 coins)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Production is now fully synced with local database!" -ForegroundColor Green
    
} else {
    Write-Host "❌ Error: Avatar and microphone sync failed" -ForegroundColor Red
    Write-Host "Please check the Cloud SQL logs for more details" -ForegroundColor Yellow
    exit 1
}

Write-Host "🏁 Avatar and microphone sync completed." -ForegroundColor Green

Write-Host ""
Write-Host "📋 To run this script:" -ForegroundColor Yellow
Write-Host "1. Update PROJECT_ID and INSTANCE_ID variables above" -ForegroundColor White
Write-Host "2. Run: PowerShell -ExecutionPolicy Bypass -File sync_avatars_microphones.ps1" -ForegroundColor White