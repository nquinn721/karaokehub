# Quick fix for coin packages in production (PowerShell)
# This script will update the production database to have exactly 5 coin packages

Write-Host "🚀 Fixing coin packages in production database..." -ForegroundColor Green

# Set your project details here - UPDATE THESE VALUES
$PROJECT_ID = "your-project-id"  # Replace with your actual project ID
$INSTANCE_ID = "your-instance-id"  # Replace with your actual Cloud SQL instance ID
$DATABASE_NAME = "karaokehub"
$SQL_FILE = "fix_coin_packages.sql"

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
Write-Host "🔄 Fixing coin packages in production database..." -ForegroundColor Cyan
$importResult = gcloud sql import sql $INSTANCE_ID gs://$BUCKET_NAME/$SQL_FILE `
    --database=$DATABASE_NAME `
    --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Coin packages fixed successfully!" -ForegroundColor Green
    
    # Clean up the temporary file from Cloud Storage
    Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Cyan
    gsutil rm gs://$BUCKET_NAME/$SQL_FILE
    
    Write-Host ""
    Write-Host "📊 You should now have exactly 5 coin packages:" -ForegroundColor Yellow
    Write-Host "   1. Starter Pack - 100 coins - `$0.99" -ForegroundColor White
    Write-Host "   2. Small Pack - 250 + 25 bonus coins - `$1.99" -ForegroundColor White
    Write-Host "   3. Medium Pack - 600 + 100 bonus coins - `$4.99" -ForegroundColor White
    Write-Host "   4. Large Pack - 1300 + 300 bonus coins - `$9.99" -ForegroundColor White
    Write-Host "   5. Mega Pack - 2800 + 700 bonus coins - `$19.99" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Coin packages are now synchronized with local database!" -ForegroundColor Green
    
} else {
    Write-Host "❌ Error: Coin package update failed" -ForegroundColor Red
    Write-Host "Please check the Cloud SQL logs for more details" -ForegroundColor Yellow
    exit 1
}

Write-Host "🏁 Coin package fix completed." -ForegroundColor Green

Write-Host ""
Write-Host "📋 To run this script:" -ForegroundColor Yellow
Write-Host "1. Update PROJECT_ID and INSTANCE_ID variables above" -ForegroundColor White
Write-Host "2. Run: PowerShell -ExecutionPolicy Bypass -File fix_coin_packages.ps1" -ForegroundColor White