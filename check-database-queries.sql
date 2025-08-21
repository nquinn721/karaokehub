-- Direct SQL queries to check parsed_schedules table state
-- Run these queries in your MySQL client to check database health

-- 1. Total record count
SELECT 'Total Records' as metric, COUNT(*) as value FROM parsed_schedules;

-- 2. Records by status
SELECT 'Records by Status' as metric, status, COUNT(*) as count 
FROM parsed_schedules 
GROUP BY status;

-- 3. Duplicate URLs (potential memory issue cause)
SELECT 'Duplicate URLs' as metric, url, COUNT(*) as duplicate_count 
FROM parsed_schedules 
WHERE status = 'PENDING_REVIEW'
GROUP BY url 
HAVING COUNT(*) > 1 
ORDER BY duplicate_count DESC 
LIMIT 10;

-- 4. Recent records (last 24 hours)
SELECT 'Recent Records (24h)' as metric, COUNT(*) as count 
FROM parsed_schedules 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);

-- 5. Table size information
SELECT 
  'Table Size' as metric,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb',
  table_rows
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'parsed_schedules';

-- 6. Sample of records to see structure
SELECT 
  id, 
  url, 
  status, 
  created_at,
  JSON_LENGTH(COALESCE(ai_analysis->>'$.shows', '[]')) as shows_count,
  JSON_LENGTH(COALESCE(ai_analysis->>'$.djs', '[]')) as djs_count
FROM parsed_schedules 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. URLs with the most records (potential aggregation targets)
SELECT 
  url, 
  COUNT(*) as record_count,
  MAX(created_at) as latest_parse,
  MIN(created_at) as earliest_parse
FROM parsed_schedules 
GROUP BY url 
ORDER BY record_count DESC 
LIMIT 10;
