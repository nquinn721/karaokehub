# Production Database Update Instructions

This document provides instructions for updating the production database with the new avatar and store systems.

## Files Created

1. **production_update_complete.sql** - Complete database update script
2. **production_data_update.sql** - Data-only dump from development database
3. **production_schema_update.sql** - Schema-only dump for table structures
4. **deploy_production_db.sh** - Bash script for automated deployment
5. **deploy_production_db.ps1** - PowerShell script for automated deployment

## Manual Database Update Steps

### Option 1: Using Google Cloud Console

1. **Create a backup first:**
   ```
   gcloud sql backups create --instance=YOUR_INSTANCE_ID --description="Backup before avatar system update"
   ```

2. **Upload the SQL file to Cloud Storage:**
   ```
   gsutil cp production_update_complete.sql gs://your-bucket-name/
   ```

3. **Import the SQL file:**
   ```
   gcloud sql import sql YOUR_INSTANCE_ID gs://your-bucket-name/production_update_complete.sql --database=karaokehub
   ```

### Option 2: Using Automated Script

1. **Update the script variables:**
   - Edit `deploy_production_db.ps1` (Windows) or `deploy_production_db.sh` (Linux/Mac)
   - Set your actual `PROJECT_ID` and `INSTANCE_ID`

2. **Run the script:**
   
   **Windows:**
   ```powershell
   PowerShell -ExecutionPolicy Bypass -File deploy_production_db.ps1
   ```
   
   **Linux/Mac:**
   ```bash
   chmod +x deploy_production_db.sh
   ./deploy_production_db.sh
   ```

## What the Update Does

### New Tables Created:
- **avatars** - Stores available avatar options
- **user_avatars** - Tracks which avatars users own and have equipped
- **coin_packages** - Defines coin purchase packages
- **transactions** - Records all store transactions

### Existing Tables Modified:
- **users** - Adds `coins` column (default 100 coins for existing users)
- **microphones** - Adds `coinPrice` and `isFree` columns

### Default Data Inserted:
- **8 avatars** (alex, blake, cameron, joe, juan, kai, onyx, tyler)
- **5 coin packages** (Starter, Small, Medium, Large, Mega)
- **Microphone pricing** updated with coin costs
- **Default assignments** for existing users (alex avatar, basic mic)

## Verification Steps

After running the update, verify the changes:

1. **Check new tables exist:**
   ```sql
   SHOW TABLES LIKE '%avatar%';
   SHOW TABLES LIKE '%coin%';
   SHOW TABLES LIKE '%transaction%';
   ```

2. **Verify avatar data:**
   ```sql
   SELECT COUNT(*) FROM avatars;  -- Should return 8
   SELECT COUNT(*) FROM user_avatars;  -- Should match user count
   ```

3. **Check coin packages:**
   ```sql
   SELECT name, coinAmount, priceUSD FROM coin_packages ORDER BY sortOrder;
   ```

4. **Verify user coins:**
   ```sql
   SELECT AVG(coins), MIN(coins), MAX(coins) FROM users;
   ```

## Rollback Plan

If issues occur, restore from the backup created before the update:

```bash
gcloud sql backups restore BACKUP_ID --restore-instance=YOUR_INSTANCE_ID
```

## Production Deployment Checklist

- [ ] Backup production database
- [ ] Test SQL script on staging environment
- [ ] Update PROJECT_ID and INSTANCE_ID in deployment scripts
- [ ] Verify gcloud authentication and permissions
- [ ] Run the database update
- [ ] Verify all tables and data are correct
- [ ] Test avatar and store functionality in production
- [ ] Monitor application logs for any issues

## Support

If you encounter issues during the deployment:

1. Check Cloud SQL operation logs in Google Cloud Console
2. Verify the SQL script syntax and foreign key constraints
3. Ensure all required permissions are granted
4. Contact the development team if manual intervention is needed

## Next Steps

After successful database update:

1. Deploy the updated application code
2. Test the avatar selection and store functionality
3. Monitor user behavior and store transactions
4. Consider promotional campaigns for the new features