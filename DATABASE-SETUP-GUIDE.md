# Database Configuration: Production vs Local Setup

## Current Configuration ✅

### Development & Production (Unified Approach)
- **Synchronize**: `false` - Always use migrations for safety
- **Logging**: `true` in development, `false` in production
- **Migrations**: Always run on startup - controlled schema changes
- **Safety**: No automatic schema modifications that could cause foreign key issues

## Key Benefits

### Unified Benefits
- **Data safety**: No accidental schema changes in any environment  
- **Consistent behavior**: Same database handling across all environments
- **Foreign key protection**: Prevents "Cannot drop index needed in foreign key constraint" errors
- **Controlled deployments**: All changes tracked via migrations
- **Audit trail**: Migration history shows what changed when

## Why We Disabled Synchronize Everywhere

**The Problem:** TypeORM synchronization can cause dangerous operations like:
- Dropping indexes that are part of foreign key constraints
- Modifying column types that break existing data
- Reordering columns in ways that affect relationships
- Making schema changes without understanding data dependencies

**The Solution:** Always use migrations for any database schema changes.

## Migration Strategy

### For All Environments
1. Modify entities as needed
2. Create corresponding migration file with proper error handling
3. Test migration thoroughly in development
4. Deploy - migrations run automatically on startup

## Error Prevention

### Foreign Key Constraint Issues ✅ FIXED
The previous error:
```
Cannot drop index 'IDX_8e1c8161ffe23571cc8e52fe7a': needed in a foreign key constraint
```

Was caused by TypeORM synchronization trying to modify indexes that were part of foreign key relationships. By disabling synchronization completely, we prevent these dangerous operations.

## Current Migration Files

1. `1737450050000-CreateAvatarsTable.ts` - Creates avatars table
2. `1737450650000-UpdateUserAvatarsTableStructure.ts` - Updates user_avatars schema
3. `1737450900000-AddStatusToTransactionsTable.ts` - Adds status column to transactions

## Environment Variable Settings

**Local Development:**
```bash
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=karaoke-hub
DATABASE_USERNAME=admin
DATABASE_PASSWORD=password
```

**Production (Google Cloud Run):**
```bash
NODE_ENV=production
DATABASE_SOCKET_PATH=/cloudsql/heroic-footing-460117-k8:us-central1:accountant
DATABASE_NAME=karaoke-hub
# Username/password come from Google Secrets
```

## Best Practices ✅

1. **Never use synchronize in production** - Can cause data loss
2. **Always create migrations for production changes** - Maintains data integrity
3. **Test migrations thoroughly** - Use safe ADD COLUMN with error handling
4. **Keep migration files** - They serve as documentation and rollback capability
5. **Use descriptive migration names** - Easy to understand what each does

## Safety Features in Current Setup

- **Error handling in migrations** - Won't fail if columns already exist
- **IF NOT EXISTS clauses** - Safe table creation
- **No dropSchema** - Never drops entire database
- **Connection pooling** - Proper connection management
- **Charset configuration** - Consistent UTF-8 handling

This setup follows industry best practices and provides the optimal balance of development speed and production safety.