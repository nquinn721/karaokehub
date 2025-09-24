-- Add Country Avatars as Epic 1200 Gold Items
-- This script adds country-themed avatars for all existing characters

-- Insert country-themed avatars with epic rarity and 1200 coin price
INSERT IGNORE INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable, isFree)
VALUES 
  (UUID(), 'Country Alex', 'Alex with classic country style and western charm', 'character', 'epic', '/images/avatar/avatars/alex-country.png', 0.0, 1200, 1, 0),
  (UUID(), 'Country Blake', 'Blake rocking the country look with authentic western flair', 'character', 'epic', '/images/avatar/avatars/blake-country.png', 0.0, 1200, 1, 0),
  (UUID(), 'Country Cameron', 'Cameron with rustic country appeal and classic western style', 'character', 'epic', '/images/avatar/avatars/cameron-country.png', 0.0, 1200, 1, 0),
  (UUID(), 'Country Joe', 'Joe with traditional country vibes and down-to-earth style', 'character', 'epic', '/images/avatar/avatars/joe-country.png', 0.0, 1200, 1, 0),
  (UUID(), 'Country Juan', 'Juan with country charm and western personality', 'character', 'epic', '/images/avatar/avatars/juan-country.png', 0.0, 1200, 1, 0),
  (UUID(), 'Country Kai', 'Kai with modern country style and contemporary western look', 'character', 'epic', '/images/avatar/avatars/kai-country.png', 0.0, 1200, 1, 0),
  (UUID(), 'Country Onyx', 'Onyx with dark country edge and mysterious western appeal', 'character', 'epic', '/images/avatar/avatars/onyx-country.png', 0.0, 1200, 1, 0),
  (UUID(), 'Country Tyler', 'Tyler with energetic country style and dynamic western presence', 'character', 'epic', '/images/avatar/avatars/tyler-country.png', 0.0, 1200, 1, 0);

-- Verify the insertion
SELECT 'Country Avatars Added:' as status;
SELECT id, name, rarity, coinPrice, isAvailable, isFree 
FROM avatars 
WHERE name LIKE 'Country %'
ORDER BY name;

-- Show total avatar count by rarity
SELECT 'Avatar Count by Rarity:' as status;
SELECT rarity, COUNT(*) as count 
FROM avatars 
GROUP BY rarity 
ORDER BY 
  CASE rarity 
    WHEN 'common' THEN 1
    WHEN 'uncommon' THEN 2  
    WHEN 'rare' THEN 3
    WHEN 'epic' THEN 4
    WHEN 'legendary' THEN 5
  END;

SELECT '✅ Country avatars successfully added as epic items for 1200 coins each!' as result;