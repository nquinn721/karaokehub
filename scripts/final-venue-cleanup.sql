-- Final cleanup for remaining venue issues
USE `karaoke-hub`;

-- Fix O'Connor's variations
UPDATE shows SET venue = 'O\'Connor\'s Club 20', city = 'COLUMBUS', state = 'OH'
WHERE venue IN ('O\'Connor\'s Club 2', 'O*Connor\'s Club 20') AND venueId IS NULL;

UPDATE shows SET city = 'COLUMBUS', state = 'OH'
WHERE venue = 'O\'Connor\'s Club 20' AND city = 'COLUMBUS' AND venueId IS NULL;

UPDATE shows SET city = 'COLUMBUS', state = 'OH'
WHERE venue = 'Club 20' AND city = 'COLUMBUS' AND venueId IS NULL;

-- Fix location data for known venues
UPDATE shows SET city = 'Columbus', state = 'OH' WHERE venue = 'Sports & Spirits' AND address = '2042 Eakin Rd' AND venueId IS NULL;
UPDATE shows SET city = 'Hilliard', state = 'OH' WHERE venue = 'OTIE\'s Tavern & Grill' AND venueId IS NULL;
UPDATE shows SET state = 'OH' WHERE venue = 'Grove City Inn' AND city = 'Grove City' AND venueId IS NULL;
UPDATE shows SET city = 'Massillon', state = 'OH' WHERE venue = 'Krackpots Comedy Club' AND venueId IS NULL;
UPDATE shows SET city = 'Columbus', state = 'OH' WHERE venue = 'Turtle Creek Tavern' AND venueId IS NULL;
UPDATE shows SET state = 'NC' WHERE venue = 'Raleigh Slim\'s' AND city = 'Raleigh' AND venueId IS NULL;
UPDATE shows SET city = 'Apex', state = 'NC' WHERE venue = 'JD\'s Tavern' AND venueId IS NULL;
UPDATE shows SET city = 'Morrisville', state = 'NC' WHERE venue = 'woody\'s morrisville' AND venueId IS NULL;
UPDATE shows SET city = 'Durham', state = 'NC' WHERE venue = 'The House' AND address = '4310 S Miami Blvd' AND venueId IS NULL;
UPDATE shows SET city = 'Columbus', state = 'OH' WHERE venue = 'WitchLab Lounge' AND address = '1187 W. Broad' AND venueId IS NULL;

-- Fix the venue name issue
UPDATE shows SET venue = 'Leap-N-Lizard\'s', city = 'Hilliard', state = 'OH' 
WHERE venue = 'venue name' AND address = '4704 Cemetery Rd.' AND venueId IS NULL;

-- Create missing venues for the updated shows
INSERT IGNORE INTO venues (id, name, address, city, state, isActive, createdAt, updatedAt)
VALUES 
  (UUID(), 'Sports & Spirits', '2042 Eakin Rd', 'Columbus', 'OH', 1, NOW(), NOW()),
  (UUID(), 'The Attic', NULL, 'Columbus', 'OH', 1, NOW(), NOW()),
  (UUID(), 'Raleigh Slim\'s', NULL, 'Raleigh', 'NC', 1, NOW(), NOW()),
  (UUID(), 'The Station', '222 Barnes Street S', 'Clayton', 'NC', 1, NOW(), NOW()),
  (UUID(), 'Kora Brew House', NULL, 'Columbus', 'OH', 1, NOW(), NOW()),
  (UUID(), 'JD\'s Tavern', NULL, 'Apex', 'NC', 1, NOW(), NOW()),
  (UUID(), 'WitchLab Lounge', '1187 W. Broad', 'Columbus', 'OH', 1, NOW(), NOW()),
  (UUID(), 'Redemption', NULL, 'Raleigh', 'NC', 1, NOW(), NOW()),
  (UUID(), 'Caddys Delight', NULL, 'Columbus', 'OH', 1, NOW(), NOW()),
  (UUID(), 'Kona Bowls', NULL, 'Columbus', 'OH', 1, NOW(), NOW()),
  (UUID(), 'The Garage Beer', NULL, 'Columbus', 'OH', 1, NOW(), NOW()),
  (UUID(), 'West End Wine Bar', NULL, 'Durham', 'NC', 1, NOW(), NOW()),
  (UUID(), 'woody\'s morrisville', NULL, 'Morrisville', 'NC', 1, NOW(), NOW()),
  (UUID(), 'The House', '4310 S Miami Blvd', 'Durham', 'NC', 1, NOW(), NOW());

-- Link all remaining shows to venues
UPDATE shows s
INNER JOIN venues v ON (
  s.address = v.address AND 
  s.city = v.city AND 
  s.state = v.state
)
SET s.venueId = v.id
WHERE s.venueId IS NULL AND s.address IS NOT NULL;

UPDATE shows s
INNER JOIN venues v ON (
  s.venue = v.name AND 
  s.city = v.city AND 
  s.state = v.state
)
SET s.venueId = v.id
WHERE s.venueId IS NULL AND s.venue IS NOT NULL;

-- Final results
SELECT 'FINAL MIGRATION RESULTS:' as status;
SELECT COUNT(*) as total_venues FROM venues;
SELECT COUNT(*) as total_shows FROM shows WHERE isActive = 1;
SELECT COUNT(*) as shows_linked_to_venues FROM shows WHERE venueId IS NOT NULL;
SELECT COUNT(*) as shows_still_unlinked FROM shows WHERE venueId IS NULL AND isActive = 1;
SELECT ROUND(COUNT(CASE WHEN venueId IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as link_percentage
FROM shows WHERE isActive = 1;

-- Show any remaining unlinked shows
SELECT 'Remaining unlinked shows:' as info;
SELECT venue, address, city, state, COUNT(*) as count
FROM shows 
WHERE venueId IS NULL AND isActive = 1 
GROUP BY venue, address, city, state;
