# Avatar & Store Data Sync Guide

## Overview
This guide helps you sync avatars, microphones, and coin packages from your local database to Cloud SQL production.

## What Was Exported
✅ **Export completed successfully!**
- 📁 File: `avatar-store-data-2025-09-20.sql`
- 📊 Size: 17.10 KB
- 📈 Data exported:
  - **avatars**: 8 records
  - **microphones**: 20 records  
  - **coin_packages**: 5 records

## Quick Start Scripts

You now have 3 npm scripts available:

```bash
# Export avatar/microphone/coin data from local DB
npm run avatars:export

# Import via Google Cloud Storage (recommended)
npm run avatars:import

# Import directly via MySQL connection  
npm run avatars:import-direct
```

## Method 1: Import via Google Cloud Storage (Recommended)

**Prerequisites:**
- gcloud CLI installed and authenticated
- Google Cloud Storage bucket access
- Cloud SQL instance configured

**Steps:**
```bash
# Run the import script
npm run avatars:import -- \
  --sql-file avatar-store-data-2025-09-20.sql \
  --instance your-cloud-sql-instance-name \
  --bucket your-gcs-bucket-name

# Example:
npm run avatars:import -- \
  --sql-file avatar-store-data-2025-09-20.sql \
  --instance karaoke-prod \
  --bucket karaoke-hub-imports
```

The script will:
1. 📤 Upload SQL file to Google Cloud Storage
2. 📥 Import data to Cloud SQL via gcloud command
3. 🔍 Show verification steps

## Method 2: Direct MySQL Import

**Prerequisites:**
- Cloud SQL instance IP address
- Database credentials
- IP whitelist configured for Cloud SQL

**Steps:**
```bash
# Run the direct import script
npm run avatars:import-direct -- \
  --sql-file avatar-store-data-2025-09-20.sql \
  --host YOUR_CLOUD_SQL_IP \
  --user YOUR_USERNAME \
  --password YOUR_PASSWORD

# Example:
npm run avatars:import-direct -- \
  --sql-file avatar-store-data-2025-09-20.sql \
  --host 34.123.456.789 \
  --user root \
  --password your-password
```

The script will:
1. 🔌 Connect directly to Cloud SQL
2. 🗑️ Clear existing avatar/microphone/coin data
3. 📥 Import new data from SQL file
4. 🔍 Verify record counts

## Manual Import (Alternative)

If you prefer manual control:

```bash
# 1. Upload to GCS manually
gsutil cp avatar-store-data-2025-09-20.sql gs://your-bucket/

# 2. Import to Cloud SQL manually  
gcloud sql import sql your-instance gs://your-bucket/avatar-store-data-2025-09-20.sql --database=karaokehub

# 3. Verify via Cloud SQL console or mysql client
```

## Verification

After import, verify the data:

```sql
-- Connect to your Cloud SQL instance and run:
SELECT COUNT(*) FROM avatars;      -- Should show: 8
SELECT COUNT(*) FROM microphones;  -- Should show: 20
SELECT COUNT(*) FROM coin_packages; -- Should show: 5

-- Check a few sample records:
SELECT id, name, type FROM avatars LIMIT 3;
SELECT id, name, type FROM microphones LIMIT 3;
SELECT id, name, price FROM coin_packages;
```

## Expected Data

**Avatars (8 total):**
- 6 free basic avatars: alex, blake, cameron, joe, juan, kai
- 2 premium avatars: onyx, tyler ($5.00 or 100 coins each)

**Microphones (20 total):**
- 4 free basic mics (silver, black, blue, red)
- 16 premium mics (emerald, ruby, gold, diamond rarities)
- Prices range from free to 2000 coins

**Coin Packages (5 total):**
- Various coin bundles for purchasing premium items

## Troubleshooting

**gcloud not found:**
- Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
- Run: `gcloud auth login`

**Permission denied:**
- Ensure you have Cloud SQL Admin or Editor role
- Check that your GCS bucket allows writes

**Connection refused:**
- Verify Cloud SQL instance IP and credentials
- Check that your IP is whitelisted for Cloud SQL access
- Ensure Cloud SQL instance is running

**Data conflicts:**
- The scripts clear existing data before importing
- Backup production data if needed before running

## Files Created

- ✅ `scripts/export-avatar-store-data.js` - Export local data
- ✅ `scripts/import-avatar-store-data.js` - Import via GCS  
- ✅ `scripts/direct-sql-import.js` - Direct MySQL import
- ✅ `avatar-store-data-2025-09-20.sql` - Exported data file
- ✅ Updated `package.json` with npm scripts

---

🎉 **You're all set!** Choose the import method that works best for your setup and run the appropriate script to sync your avatar data to Cloud SQL production.