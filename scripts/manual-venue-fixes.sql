-- Simple venue linking fix
USE `karaoke-hub`;

-- Manual fixes for the most common problematic cases
-- Fix O*Connors vs O'Connor's naming issue
UPDATE shows 
SET venue = 'O\'Connor\'s Club 20', city = 'COLUMBUS', state = 'OH'
WHERE venue = 'O*Connors Club 20' AND venueId IS NULL;

-- Fix Toolbox missing location
UPDATE shows 
SET city = 'Columbus', state = 'OH'
WHERE venue = 'Toolbox' AND address = '744 Frebis Ave' AND venueId IS NULL;

-- Fix Burnzie's missing location
UPDATE shows 
SET city = 'Hilliard', state = 'OH'
WHERE venue = 'Burnzie\'s Old Trail' AND address = '72 S. Grener Ave' AND venueId IS NULL;

-- Fix Leap-N-Lizard's missing location
UPDATE shows 
SET city = 'Hilliard', state = 'OH'
WHERE venue = 'Leap-N-Lizard\'s' AND address = '4704 Cemetery Rd' AND venueId IS NULL;

-- Fix Sports & Spirits missing location
UPDATE shows 
SET city = 'Columbus', state = 'OH'
WHERE venue = 'Sports & Spirits' AND address = '2042 Eakin Rd' AND venueId IS NULL;

-- Fix Grove City Inn missing state
UPDATE shows 
SET state = 'OH'
WHERE venue = 'Grove City Inn' AND city = 'Grove City' AND venueId IS NULL;

-- Now try to link these fixed shows to existing venues
UPDATE shows s
INNER JOIN venues v ON (
  s.address = v.address AND 
  s.city = v.city AND 
  s.state = v.state
)
SET s.venueId = v.id
WHERE s.venueId IS NULL AND s.address IS NOT NULL;

-- Link by venue name for shows without addresses
UPDATE shows s
INNER JOIN venues v ON (
  s.venue = v.name AND 
  s.city = v.city AND 
  s.state = v.state AND
  v.address IS NULL
)
SET s.venueId = v.id
WHERE s.venueId IS NULL 
  AND (s.address IS NULL OR s.address = '')
  AND s.venue IS NOT NULL;

-- Create venues for any remaining shows that still need them
INSERT INTO venues (id, name, address, city, state, lat, lng, isActive, createdAt, updatedAt)
SELECT 
  UUID() as id,
  'Garage Beer' as name,
  NULL as address,
  'Columbus' as city,
  'OH' as state,
  39.9612 as lat,
  -82.9988 as lng,
  1 as isActive,
  NOW() as createdAt,
  NOW() as updatedAt
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Garage Beer' AND city = 'Columbus');

-- Update Garage Beer shows
UPDATE shows 
SET city = 'Columbus', state = 'OH'
WHERE venue = 'Garage Beer' AND venueId IS NULL;

UPDATE shows s
INNER JOIN venues v ON (s.venue = v.name AND s.city = v.city AND s.state = v.state)
SET s.venueId = v.id
WHERE s.venue = 'Garage Beer' AND s.venueId IS NULL;

-- Final summary
SELECT 'Final Venue Migration Summary:' as info;
SELECT COUNT(*) as total_venues FROM venues;
SELECT COUNT(*) as shows_with_venues FROM shows WHERE venueId IS NOT NULL;
SELECT COUNT(*) as shows_without_venues FROM shows WHERE venueId IS NULL AND isActive = 1;

-- List any remaining unlinked shows
SELECT venue, address, city, state, COUNT(*) as count
FROM shows 
WHERE venueId IS NULL AND isActive = 1 
GROUP BY venue, address, city, state
HAVING COUNT(*) > 0;
