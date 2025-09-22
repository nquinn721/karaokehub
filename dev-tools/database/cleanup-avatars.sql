-- Clean up avatars and keep only the 8 real ones

-- First, let's see what we have
SELECT 'CURRENT AVATARS:' as info;
SELECT id, name, image_url, rarity, is_free, coin_price FROM avatars ORDER BY id;

-- Count current avatars
SELECT 'TOTAL COUNT:' as info, COUNT(*) as count FROM avatars;

-- Delete all existing avatars
DELETE FROM avatars;

-- Insert the 8 real avatars
INSERT INTO avatars (name, image_url, rarity, is_free, coin_price) VALUES
('Alex', '/images/avatar/avatars/alex.png', 'common', true, 0),
('Blake', '/images/avatar/avatars/blake.png', 'common', true, 0),
('Cameron', '/images/avatar/avatars/cameron.png', 'common', true, 0),
('Joe', '/images/avatar/avatars/joe.png', 'common', true, 0),
('Juan', '/images/avatar/avatars/juan.png', 'common', true, 0),
('Kai', '/images/avatar/avatars/kai.png', 'common', true, 0),
('Onyx', '/images/avatar/avatars/onyx.png', 'uncommon', false, 100),
('Tyler', '/images/avatar/avatars/tyler.png', 'uncommon', false, 100);

-- Show final result
SELECT 'FINAL AVATARS:' as info;
SELECT id, name, image_url, rarity, is_free, coin_price FROM avatars ORDER BY id;

SELECT 'FINAL COUNT:' as info, COUNT(*) as count FROM avatars;