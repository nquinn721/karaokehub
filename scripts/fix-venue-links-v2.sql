-- Fix incomplete venue data and link remaining shows (MySQL compatible version)
USE `karaoke-hub`;

-- Create a temporary table with complete venue info
CREATE TEMPORARY TABLE temp_venue_info AS
SELECT venue, address, city, state, COUNT(*) as frequency
FROM shows 
WHERE venue IS NOT NULL 
  AND city IS NOT NULL 
  AND state IS NOT NULL
  AND isActive = 1
GROUP BY venue, address, city, state
ORDER BY venue, COUNT(*) DESC;

-- Update shows missing city/state by matching venue + address
UPDATE shows s1
JOIN temp_venue_info t ON (s1.venue = t.venue AND s1.address = t.address)
SET s1.city = t.city, s1.state = t.state
WHERE s1.venueId IS NULL 
  AND s1.isActive = 1
  AND (s1.city IS NULL OR s1.state IS NULL);

-- For shows still missing city/state, try matching by venue name only (use most frequent city/state)
UPDATE shows s1
JOIN (
  SELECT venue, city, state, 
         ROW_NUMBER() OVER (PARTITION BY venue ORDER BY COUNT(*) DESC) as rn
  FROM temp_venue_info
  GROUP BY venue, city, state
) t ON s1.venue = t.venue AND t.rn = 1
SET s1.city = t.city, s1.state = t.state
WHERE s1.venueId IS NULL 
  AND s1.isActive = 1
  AND (s1.city IS NULL OR s1.state IS NULL);

-- Now create venues for shows that now have complete data
-- First, for shows with addresses
INSERT IGNORE INTO venues (id, name, address, city, state, zip, lat, lng, phone, website, isActive, createdAt, updatedAt)
SELECT 
  UUID() as id,
  s1.venue as name,
  s1.address,
  s1.city,
  s1.state,
  s1.zip,
  AVG(s1.lat) as lat,
  AVG(s1.lng) as lng,
  (SELECT venuePhone FROM shows s3 
   WHERE s3.address = s1.address AND s3.city = s1.city AND s3.state = s1.state 
   AND s3.venuePhone IS NOT NULL AND s3.venuePhone != '' 
   LIMIT 1) as phone,
  (SELECT venueWebsite FROM shows s4 
   WHERE s4.address = s1.address AND s4.city = s1.city AND s4.state = s1.state 
   AND s4.venueWebsite IS NOT NULL AND s4.venueWebsite != '' 
   LIMIT 1) as website,
  1 as isActive,
  NOW() as createdAt,
  NOW() as updatedAt
FROM shows s1
WHERE s1.venueId IS NULL
  AND s1.address IS NOT NULL 
  AND s1.address != '' 
  AND s1.isActive = 1
  AND s1.city IS NOT NULL 
  AND s1.city != ''
  AND s1.state IS NOT NULL 
  AND s1.state != ''
GROUP BY s1.address, s1.city, s1.state;

-- Then for shows without addresses
INSERT IGNORE INTO venues (id, name, address, city, state, zip, lat, lng, phone, website, isActive, createdAt, updatedAt)
SELECT 
  UUID() as id,
  s1.venue as name,
  NULL as address,
  s1.city,
  s1.state,
  s1.zip,
  AVG(s1.lat) as lat,
  AVG(s1.lng) as lng,
  (SELECT venuePhone FROM shows s2 
   WHERE s2.venue = s1.venue AND s2.city = s1.city AND s2.state = s1.state 
   AND s2.venuePhone IS NOT NULL AND s2.venuePhone != '' 
   LIMIT 1) as phone,
  (SELECT venueWebsite FROM shows s3 
   WHERE s3.venue = s1.venue AND s3.city = s1.city AND s3.state = s1.state 
   AND s3.venueWebsite IS NOT NULL AND s3.venueWebsite != '' 
   LIMIT 1) as website,
  1 as isActive,
  NOW() as createdAt,
  NOW() as updatedAt
FROM shows s1
WHERE s1.venueId IS NULL
  AND (s1.address IS NULL OR s1.address = '')
  AND s1.venue IS NOT NULL 
  AND s1.venue != ''
  AND s1.isActive = 1
  AND s1.city IS NOT NULL 
  AND s1.city != ''
  AND s1.state IS NOT NULL 
  AND s1.state != ''
GROUP BY s1.venue, s1.city, s1.state;

-- Link shows to venues by address
UPDATE shows s
INNER JOIN venues v ON (
  s.address = v.address AND 
  s.city = v.city AND 
  s.state = v.state
)
SET s.venueId = v.id
WHERE s.address IS NOT NULL 
  AND s.address != ''
  AND s.venueId IS NULL;

-- Link shows to venues by name (no address)
UPDATE shows s
INNER JOIN venues v ON (
  s.venue = v.name AND 
  s.city = v.city AND 
  s.state = v.state AND
  v.address IS NULL
)
SET s.venueId = v.id
WHERE (s.address IS NULL OR s.address = '')
  AND s.venue IS NOT NULL 
  AND s.venue != ''
  AND s.venueId IS NULL;

-- Clean up
DROP TEMPORARY TABLE temp_venue_info;

-- Final results
SELECT 'Final Results:' as info;
SELECT COUNT(*) as total_venues FROM venues;
SELECT COUNT(*) as shows_linked_to_venues FROM shows WHERE venueId IS NOT NULL;
SELECT COUNT(*) as active_shows_still_unlinked FROM shows WHERE venueId IS NULL AND isActive = 1;

-- Show remaining problematic shows
SELECT 'Shows still needing manual attention:' as info;
SELECT venue, address, city, state, COUNT(*) as count
FROM shows 
WHERE venueId IS NULL AND isActive = 1 
GROUP BY venue, address, city, state
ORDER BY COUNT(*) DESC
LIMIT 10;
