# Facebook Parser Database Aggregation Strategy

## Problem Statement

The Facebook parser was creating excessive database records, leading to:

- MySQL "Out of sort memory" errors on large ORDER BY queries
- Database bloat with duplicate parsed_schedule records for the same URLs
- Performance degradation due to table size

## Solution Implementation

### 1. Database Aggregation Before Insert

**Location**: `src/parser/facebook-parser.service.ts` - `parseAndSaveFacebookPage()` method

**Strategy**: Before creating a new `parsed_schedule` record, check if one already exists for the same URL with `PENDING_REVIEW` status.

```typescript
// Check for existing record
const existingSchedule = await this.parsedScheduleRepository.findOne({
  where: {
    url: url,
    status: ParseStatus.PENDING_REVIEW,
  },
  order: { createdAt: 'DESC' },
});
```

**Benefits**:

- Prevents duplicate records for the same URL
- Aggregates parsing results instead of creating new entries
- Reduces database growth rate significantly

### 2. Data Deduplication

**Implementation**: Added deduplication methods for shows and DJs:

- `deduplicateShows()`: Removes duplicate shows based on venue + datetime
- `deduplicateDJs()`: Removes duplicate DJs based on name
- Completeness scoring to keep the most detailed version when duplicates exist

**Logic**:

```typescript
// Shows: key = venue_datetime
const key = `${show.venue?.toLowerCase() || 'unknown'}_${show.datetime || show.date || 'notime'}`;

// DJs: key = name (lowercase)
const key = dj.name?.toLowerCase() || 'unknown';
```

### 3. Intelligent Data Merging

When updating existing records:

1. Merge new shows/DJs with existing ones
2. Apply deduplication to combined results
3. Update metadata (showsFound, djsFound, lastUpdate)
4. Append new parsing logs to existing logs

### 4. Memory Optimization

**Before**: Each parsing session created a new record
**After**: Parsing sessions update existing records when possible

This directly addresses the MySQL sort memory issue by:

- Keeping table size manageable
- Reducing ORDER BY query complexity
- Maintaining data quality through deduplication

## Testing and Validation

### Database State Monitoring

Use the provided SQL queries in `check-database-queries.sql` to monitor:

- Total record count
- Duplicate URL detection
- Table size metrics
- Recent parsing activity

### Key Metrics to Watch

1. **Duplicate URLs**: Should decrease over time

   ```sql
   SELECT url, COUNT(*) as count FROM parsed_schedules
   WHERE status = 'PENDING_REVIEW' GROUP BY url HAVING COUNT(*) > 1;
   ```

2. **Table Growth Rate**: Should slow significantly

   ```sql
   SELECT DATE(created_at) as date, COUNT(*) as daily_records
   FROM parsed_schedules GROUP BY DATE(created_at) ORDER BY date DESC;
   ```

3. **Average Data per Record**: Should increase (more comprehensive records)
   ```sql
   SELECT AVG(JSON_LENGTH(ai_analysis->>'$.shows')) as avg_shows_per_record
   FROM parsed_schedules WHERE ai_analysis IS NOT NULL;
   ```

## Performance Impact

### Expected Improvements

- **Database Queries**: Faster ORDER BY operations due to smaller table size
- **Storage**: Reduced disk usage and index size
- **Memory**: Lower MySQL sort memory requirements
- **Parsing**: Faster lookups for existing records

### Monitoring Commands

```bash
# Check current database state
mysql -u username -p database_name < check-database-queries.sql

# Monitor table size over time
mysql -u username -p -e "SELECT ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb' FROM information_schema.tables WHERE table_name = 'parsed_schedules'"
```

## Configuration Notes

### Environment Variables

No new environment variables required - uses existing database configuration.

### Migration Considerations

- Existing records remain unchanged
- New parsing behavior applies to future operations
- No data loss or breaking changes

### Rollback Strategy

If issues arise, the aggregation logic can be disabled by commenting out the existing record check:

```typescript
// const existingSchedule = await this.parsedScheduleRepository.findOne({...});
const existingSchedule = null; // Force new record creation
```

## Code Changes Summary

1. **Added**: Existing record lookup in `parseAndSaveFacebookPage()`
2. **Added**: Data deduplication methods
3. **Added**: Intelligent merging logic
4. **Added**: Completeness scoring for conflict resolution
5. **Modified**: Return structure to include update status

## Future Enhancements

1. **Periodic Cleanup**: Add scheduled task to merge old duplicate records
2. **Advanced Deduplication**: Use fuzzy matching for venue names
3. **Performance Monitoring**: Add metrics collection for aggregation effectiveness
4. **Configuration**: Make aggregation behavior configurable via environment variables

## Troubleshooting

### Common Issues

1. **"No aggregation happening"**: Check if records have different statuses
2. **"Data not merging"**: Verify deduplication logic with test data
3. **"Performance still slow"**: Consider adding database indexes on url + status

### Debug Commands

```bash
# Test aggregation with specific URL
node -e "console.log('Testing aggregation for specific URL')"

# Check recent database activity
mysql -e "SELECT * FROM parsed_schedules ORDER BY created_at DESC LIMIT 5"
```
