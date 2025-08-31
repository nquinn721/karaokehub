# Safe Production Data Management

This guide explains how to safely transfer show/venue/vendor/DJ data between environments without affecting user data, payments, or authentication.

## 🚨 What Went Wrong Before

Previously, a full database dump overwrote ALL production data including:
- ❌ Users and their accounts
- ❌ Authentication sessions  
- ❌ Payment information
- ❌ User favorites and preferences
- ❌ Feedback and reviews

## ✅ The Safe Solution

Our new system only transfers **content data** while protecting **user data**:

### Safe Tables (✅ Can be imported)
- `venues` - Karaoke venues
- `shows` - Show schedules  
- `djs` - DJ information
- `vendors` - Vendor/company data
- `parsed_schedules` - Parsed show data

### Protected Tables (🔒 Never touched)
- `users` - User accounts
- `user_sessions` - Login sessions
- `user_feature_overrides` - User preferences
- `favorite_shows` - User favorites
- `feedback` - User feedback
- `show_reviews` - User reviews
- `migrations` - Database schema

## 🛠️ Available Commands

### Export Data (from Local/Staging)
```bash
# Export all safe data
npm run data:export

# Export to specific file
npm run data:export-local

# Create production backup
npm run data:backup
```

### Import Data (to Production)
```bash
# DRY RUN FIRST (recommended)
npm run data:import-dry -- --source exports/safe-export.sql

# Import specific tables only
npm run data:import -- --source exports/safe-export.sql --tables venues,shows

# Import without backup (not recommended)
npm run data:import -- --source exports/safe-export.sql --no-backup
```

## 📋 Step-by-Step Workflow

### 1. Export from Local Environment
```bash
# In your local KaraokeHub directory
npm run data:export-local
```
This creates: `exports/local-safe-export-YYYY-MM-DD.sql`

### 2. Transfer File to Production
Upload the export file to your production server.

### 3. Test Import (DRY RUN)
```bash
# On production server - TEST FIRST!
npm run data:import-dry -- --source path/to/local-safe-export.sql
```

### 4. Create Production Backup
```bash
# Backup current production data
npm run data:backup
```

### 5. Import New Data
```bash
# Import the safe data
npm run data:import -- --source path/to/local-safe-export.sql
```

## 🔍 Safety Features

### 1. Table Validation
- Scripts automatically reject any attempt to import protected tables
- Unknown tables trigger warnings
- Clear error messages prevent mistakes

### 2. Automatic Backups
- Production data is backed up before any import
- Backups stored in `backups/` directory with timestamps
- Easy rollback if needed

### 3. Dry Run Mode
- Test imports without making changes
- Shows exactly what would happen
- Validates file contents and table structure

### 4. Foreign Key Safety
- Temporarily disables foreign key checks during import
- Ensures data integrity during the process
- Re-enables checks after completion

## 📁 Directory Structure

```
KaraokeHub/
├── scripts/
│   ├── safe-data-export.js         # Export script
│   ├── safe-data-import-typeorm.js # Import script (no mysql2)
│   └── manage-production-data.sh   # Shell wrapper
├── exports/                        # Exported data files
├── backups/                        # Production backups
└── package.json                    # Scripts configuration
```

## 🚨 Emergency Rollback

If something goes wrong:

```bash
# Find your backup file
ls backups/production-backup-*.sql

# Restore from backup
npm run data:import -- --source backups/production-backup-YYYY-MM-DD.sql --no-backup
```

## 💡 Best Practices

### Before Every Import:
1. ✅ Run dry-run first
2. ✅ Create production backup  
3. ✅ Verify file contents
4. ✅ Test with small subset if possible

### Regular Maintenance:
- Clean up old export files monthly
- Keep at least 3 production backups
- Document any manual data changes
- Test restore process periodically

## 🔧 Environment Variables

Make sure these are set in your production environment:

```bash
DB_HOST=your-production-host
DB_PORT=3306
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password
DB_DATABASE=karaoke-hub
```

## ❓ Troubleshooting

### Common Issues:

**"Table not found" errors:**
- Check if the table exists in both environments
- Verify table names match exactly

**"Foreign key constraint" errors:**
- Check if related data exists (e.g., venues for shows)
- Import in correct order: vendors → venues → djs → shows

**"Permission denied" errors:**
- Verify database user has INSERT/DELETE permissions
- Check if tables are locked by other processes

**"File not found" errors:**
- Use absolute file paths
- Ensure export file was created successfully

### Getting Help:

1. Check the export/import logs
2. Verify database connectivity
3. Test with a small subset of data
4. Use dry-run mode to diagnose issues

## 🎯 Summary

This system ensures that:
- ✅ User data is never affected
- ✅ Content updates are safe and reversible  
- ✅ Production data is always backed up
- ✅ Process is testable and predictable
- ✅ No mysql2 dependency required
