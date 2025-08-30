-- Extract Venues from Shows Data
-- This script creates unique venues from existing show data

USE `karaoke-hub`;

-- First, let's see what we're working with
SELECT 'Current state:' as info;
SELECT COUNT(*) as total_active_shows FROM shows WHERE isActive = 1;
SELECT COUNT(*) as shows_with_venue_names FROM shows WHERE isActive = 1 AND venue IS NOT NULL AND venue != '';
SELECT COUNT(*) as shows_with_addresses FROM shows WHERE isActive = 1 AND address IS NOT NULL AND address != '';
SELECT COUNT(*) as existing_venues FROM venues;

-- Strategy 1: Create venues grouped by address (most reliable grouping)
-- This handles multiple venue names at the same address
INSERT INTO venues (id, name, address, city, state, zip, lat, lng, phone, website, isActive, createdAt, updatedAt)
SELECT 
  UUID() as id,
  -- Use the most common venue name for this address, or create a generic name
  COALESCE(
    (SELECT venue FROM shows s2 
     WHERE s2.address = s1.address AND s2.city = s1.city AND s2.state = s1.state 
     AND s2.venue IS NOT NULL AND s2.venue != '' 
     GROUP BY s2.venue 
     ORDER BY COUNT(*) DESC, s2.venue 
     LIMIT 1),
    CONCAT('Venue at ', s1.address)
  ) as name,
  s1.address,
  s1.city,
  s1.state,
  s1.zip,
  AVG(s1.lat) as lat,
  AVG(s1.lng) as lng,
  -- Get the first non-null phone number for this address
  (SELECT venuePhone FROM shows s3 
   WHERE s3.address = s1.address AND s3.city = s1.city AND s3.state = s1.state 
   AND s3.venuePhone IS NOT NULL AND s3.venuePhone != '' 
   LIMIT 1) as phone,
  -- Get the first non-null website for this address
  (SELECT venueWebsite FROM shows s4 
   WHERE s4.address = s1.address AND s4.city = s1.city AND s4.state = s1.state 
   AND s4.venueWebsite IS NOT NULL AND s4.venueWebsite != '' 
   LIMIT 1) as website,
  1 as isActive,
  NOW() as createdAt,
  NOW() as updatedAt
FROM shows s1
WHERE s1.address IS NOT NULL 
  AND s1.address != '' 
  AND s1.isActive = 1
  -- Ensure we have city and state for proper grouping
  AND s1.city IS NOT NULL 
  AND s1.city != ''
  AND s1.state IS NOT NULL 
  AND s1.state != ''
GROUP BY s1.address, s1.city, s1.state, s1.zip;

-- Strategy 2: Create venues for shows without addresses, grouped by venue name + location
-- This handles venues that don't have street addresses but have consistent names
INSERT INTO venues (id, name, address, city, state, zip, lat, lng, phone, website, isActive, createdAt, updatedAt)
SELECT 
  UUID() as id,
  s1.venue as name,
  NULL as address, -- No street address available
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
WHERE (s1.address IS NULL OR s1.address = '')
  AND s1.venue IS NOT NULL 
  AND s1.venue != ''
  AND s1.isActive = 1
  AND s1.city IS NOT NULL 
  AND s1.city != ''
  AND s1.state IS NOT NULL 
  AND s1.state != ''
  -- Don't create duplicates if a venue with same name+city+state already exists
  AND NOT EXISTS (
    SELECT 1 FROM venues v 
    WHERE v.name = s1.venue 
    AND v.city = s1.city 
    AND v.state = s1.state 
  )
GROUP BY s1.venue, s1.city, s1.state, s1.zip;

-- Now link shows to venues
SELECT 'Linking shows to venues...' as info;

-- Link by address first (most reliable)
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

-- Link by venue name for shows without addresses
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

-- Final statistics
SELECT 'Migration Results:' as info;
SELECT COUNT(*) as total_venues FROM venues;
SELECT COUNT(*) as venues_with_addresses FROM venues WHERE address IS NOT NULL;
SELECT COUNT(*) as venues_without_addresses FROM venues WHERE address IS NULL;
SELECT COUNT(*) as shows_linked_to_venues FROM shows WHERE venueId IS NOT NULL;
SELECT COUNT(*) as active_shows_still_unlinked FROM shows WHERE venueId IS NULL AND isActive = 1;

-- Show some examples of created venues
SELECT 'Sample venues created:' as info;
SELECT v.name, v.address, v.city, v.state, 
       (SELECT COUNT(*) FROM shows WHERE venueId = v.id) as linked_shows
FROM venues v 
ORDER BY (SELECT COUNT(*) FROM shows WHERE venueId = v.id) DESC
LIMIT 10;

-- Show examples of unlinked shows (if any)
SELECT 'Sample unlinked shows (need manual review):' as info;
SELECT venue, address, city, state, COUNT(*) as show_count
FROM shows 
WHERE venueId IS NULL AND isActive = 1 
GROUP BY venue, address, city, state
ORDER BY COUNT(*) DESC
LIMIT 5;
