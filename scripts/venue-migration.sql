-- Venue Migration Script
-- This script creates the venues table and links shows to venues

USE `karaoke-hub`;

-- 1. Create venues table if it doesn't exist
CREATE TABLE IF NOT EXISTS venues (
  id varchar(36) NOT NULL PRIMARY KEY,
  name varchar(255) NOT NULL,
  address varchar(255) NULL,
  city varchar(255) NULL,
  state varchar(255) NULL,
  zip varchar(255) NULL,
  lat decimal(10,8) NULL,
  lng decimal(11,8) NULL,
  phone varchar(255) NULL,
  website varchar(255) NULL,
  description text NULL,
  isActive boolean DEFAULT 1,
  createdAt timestamp DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Create indexes on venues table
CREATE INDEX IF NOT EXISTS IDX_venues_name ON venues (name);
CREATE INDEX IF NOT EXISTS IDX_venues_address ON venues (address);
CREATE INDEX IF NOT EXISTS IDX_venues_city_state ON venues (city, state);
CREATE INDEX IF NOT EXISTS IDX_venues_location ON venues (lat, lng);

-- 3. Add venueId column to shows table if it doesn't exist
ALTER TABLE shows ADD COLUMN IF NOT EXISTS venueId varchar(36) NULL;

-- 4. Check current state
SELECT 'Current state before migration:' as info;
SELECT COUNT(*) as total_shows FROM shows WHERE isActive = 1;
SELECT COUNT(*) as existing_venues FROM venues;

-- 5. Create venues from shows grouped by address (primary strategy)
INSERT IGNORE INTO venues (id, name, address, city, state, zip, lat, lng, phone, website)
SELECT 
  UUID() as id,
  COALESCE(
    (SELECT venue FROM shows s2 
     WHERE s2.address = s1.address AND s2.city = s1.city AND s2.state = s1.state 
     AND s2.venue IS NOT NULL AND s2.venue != '' 
     ORDER BY s2.venue LIMIT 1),
    CONCAT('Venue at ', s1.address)
  ) as name,
  s1.address,
  s1.city,
  s1.state,
  s1.zip,
  AVG(s1.lat) as lat,
  AVG(s1.lng) as lng,
  (SELECT venuePhone FROM shows s3 
   WHERE s3.address = s1.address AND s3.city = s1.city AND s3.state = s1.state 
   AND s3.venuePhone IS NOT NULL AND s3.venuePhone != '' 
   ORDER BY s3.venuePhone LIMIT 1) as phone,
  (SELECT venueWebsite FROM shows s4 
   WHERE s4.address = s1.address AND s4.city = s1.city AND s4.state = s1.state 
   AND s4.venueWebsite IS NOT NULL AND s4.venueWebsite != '' 
   ORDER BY s4.venueWebsite LIMIT 1) as website
FROM shows s1
WHERE s1.address IS NOT NULL 
  AND s1.address != '' 
  AND s1.isActive = 1
GROUP BY s1.address, s1.city, s1.state, s1.zip;

-- 6. Create venues for shows without addresses (group by venue name + location)
INSERT IGNORE INTO venues (id, name, address, city, state, zip, lat, lng, phone, website)
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
   ORDER BY s2.venuePhone LIMIT 1) as phone,
  (SELECT venueWebsite FROM shows s3 
   WHERE s3.venue = s1.venue AND s3.city = s1.city AND s3.state = s1.state 
   AND s3.venueWebsite IS NOT NULL AND s3.venueWebsite != '' 
   ORDER BY s3.venueWebsite LIMIT 1) as website
FROM shows s1
WHERE (s1.address IS NULL OR s1.address = '')
  AND s1.venue IS NOT NULL 
  AND s1.venue != ''
  AND s1.isActive = 1
  AND NOT EXISTS (
    SELECT 1 FROM venues v 
    WHERE v.name = s1.venue 
    AND v.city = s1.city 
    AND v.state = s1.state 
    AND v.address IS NULL
  )
GROUP BY s1.venue, s1.city, s1.state, s1.zip;

-- 7. Link shows to venues by address
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

-- 8. Link shows to venues by venue name (for shows without addresses)
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

-- 9. Show migration results
SELECT 'Migration results:' as info;
SELECT COUNT(*) as total_venues FROM venues;
SELECT COUNT(*) as shows_with_venues FROM shows WHERE venueId IS NOT NULL;
SELECT COUNT(*) as active_shows_without_venues FROM shows WHERE venueId IS NULL AND isActive = 1;

-- 10. Show sample of unlinked shows for review
SELECT 'Sample unlinked shows:' as info;
SELECT id, venue, address, city, state 
FROM shows 
WHERE venueId IS NULL AND isActive = 1 
LIMIT 5;

-- 11. Show sample venues created
SELECT 'Sample venues created:' as info;
SELECT id, name, address, city, state, 
       (SELECT COUNT(*) FROM shows WHERE venueId = venues.id) as show_count
FROM venues 
ORDER BY createdAt DESC 
LIMIT 10;
