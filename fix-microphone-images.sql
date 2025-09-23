-- Migration to fix microphone image URLs
-- Run this on production database to fix the image paths

-- Update Basic Microphone
UPDATE microphones 
SET imageUrl = '/images/avatar/parts/microphones/mic_basic_1.png' 
WHERE name = 'Basic Microphone' AND imageUrl = '/assets/microphones/basic.png';

-- Update Vintage Classic
UPDATE microphones 
SET imageUrl = '/images/avatar/parts/microphones/mic_gold_2.png' 
WHERE name = 'Vintage Classic' AND imageUrl = '/assets/microphones/vintage.png';

-- Update Modern Pro
UPDATE microphones 
SET imageUrl = '/images/avatar/parts/microphones/mic_emerald_3.png' 
WHERE name = 'Modern Pro' AND imageUrl = '/assets/microphones/modern-pro.png';

-- Update Wireless Freedom
UPDATE microphones 
SET imageUrl = '/images/avatar/parts/microphones/mic_ruby_1.png' 
WHERE name = 'Wireless Freedom' AND imageUrl = '/assets/microphones/wireless.png';

-- Update Golden Premium (if exists)
UPDATE microphones 
SET imageUrl = '/images/avatar/parts/microphones/mic_diamond_4.png' 
WHERE name LIKE '%Golden%' AND imageUrl = '/assets/microphones/golden.png';

-- Show the updated records
SELECT id, name, imageUrl FROM microphones WHERE imageUrl LIKE '/images/avatar/parts/microphones/%';