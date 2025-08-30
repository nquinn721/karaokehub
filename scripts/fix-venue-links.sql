-- Fix incomplete venue data and link remaining shows
USE `karaoke-hub`;

-- Update shows with missing city/state data by looking at similar venues
UPDATE shows s1
JOIN (
  SELECT venue, address, city, state
  FROM shows 
  WHERE venue IS NOT NULL 
    AND city IS NOT NULL 
    AND state IS NOT NULL
    AND isActive = 1
  GROUP BY venue, address, city, state
) s2 ON (s1.venue = s2.venue AND s1.address = s2.address)
SET s1.city = s2.city, s1.state = s2.state
WHERE s1.venueId IS NULL 
  AND s1.isActive = 1
  AND (s1.city IS NULL OR s1.state IS NULL);

-- Update shows with missing city/state data by venue name only (when address matches aren't available)
UPDATE shows s1
JOIN (
  SELECT venue, city, state, COUNT(*) as freq
  FROM shows 
  WHERE venue IS NOT NULL 
    AND city IS NOT NULL 
    AND state IS NOT NULL
    AND isActive = 1
  GROUP BY venue, city, state
  ORDER BY COUNT(*) DESC
) s2 ON s1.venue = s2.venue
SET s1.city = s2.city, s1.state = s2.state
WHERE s1.venueId IS NULL 
  AND s1.isActive = 1
  AND (s1.city IS NULL OR s1.state IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM shows s3 
    WHERE s3.venue = s1.venue 
      AND s3.city IS NOT NULL 
      AND s3.state IS NOT NULL 
      AND s3.city != s2.city OR s3.state != s2.state
  );

-- Create venues for the newly updated shows with addresses
INSERT IGNORE INTO venues (id, name, address, city, state, zip, lat, lng, phone, website, isActive, createdAt, updatedAt)
SELECT 
  UUID() as id,
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
GROUP BY s1.address, s1.city, s1.state, s1.zip;

-- Create venues for shows without addresses but with venue names and updated city/state
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
  AND NOT EXISTS (
    SELECT 1 FROM venues v 
    WHERE v.name = s1.venue 
    AND v.city = s1.city 
    AND v.state = s1.state 
  )
GROUP BY s1.venue, s1.city, s1.state, s1.zip;

-- Link the updated shows to venues by address
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

-- Link shows by venue name (for those without addresses)
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

-- Final results
SELECT 'Updated Results:' as info;
SELECT COUNT(*) as total_venues FROM venues;
SELECT COUNT(*) as shows_linked_to_venues FROM shows WHERE venueId IS NOT NULL;
SELECT COUNT(*) as active_shows_still_unlinked FROM shows WHERE venueId IS NULL AND isActive = 1;

-- Show remaining unlinked shows
SELECT 'Remaining unlinked shows:' as info;
SELECT venue, address, city, state, COUNT(*) as count
FROM shows 
WHERE venueId IS NULL AND isActive = 1 
GROUP BY venue, address, city, state
ORDER BY COUNT(*) DESC;
