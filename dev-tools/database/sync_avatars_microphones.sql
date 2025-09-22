-- Production Database Sync: Avatars and Microphones
-- This script will replace old avatars with new ones and add all microphones
-- Date: September 20, 2025

-- =====================================================
-- CLEAN UP EXISTING DATA
-- =====================================================

-- Remove all existing avatars (replace old 25 with new 8)
DELETE FROM avatars;

-- Remove all existing microphones (production has 0, adding all 20)
DELETE FROM microphones;

-- =====================================================
-- INSERT NEW AVATARS (8 new ones with updated URLs)
-- =====================================================

INSERT INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable, createdAt, updatedAt, isFree) VALUES
('alex', 'Alex', 'A friendly and versatile performer with a warm personality', 'basic', 'common', '/images/avatar/avatars/alex.png', 0.00, 0, 1, '2025-09-20 11:29:02.485953', '2025-09-20 11:29:02.485953', 1),
('blake', 'Blake', 'A confident artist with modern style and great stage presence', 'basic', 'common', '/images/avatar/avatars/blake.png', 0.00, 0, 1, '2025-09-20 11:29:02.485953', '2025-09-20 11:29:02.485953', 1),
('cameron', 'Cameron', 'A dynamic performer with classic appeal and natural charisma', 'basic', 'common', '/images/avatar/avatars/cameron.png', 0.00, 0, 1, '2025-09-20 11:29:02.485953', '2025-09-20 11:29:02.485953', 1),
('joe', 'Joe', 'A reliable and steady performer with authentic charm', 'basic', 'common', '/images/avatar/avatars/joe.png', 0.00, 0, 1, '2025-09-20 11:29:02.485953', '2025-09-20 11:29:02.485953', 1),
('juan', 'Juan', 'A passionate singer with vibrant energy and cultural flair', 'basic', 'common', '/images/avatar/avatars/juan.png', 0.00, 0, 1, '2025-09-20 11:29:02.485953', '2025-09-20 11:29:02.485953', 1),
('kai', 'Kai', 'A creative artist with unique style and artistic vision', 'basic', 'common', '/images/avatar/avatars/kai.png', 0.00, 0, 1, '2025-09-20 11:29:02.485953', '2025-09-20 11:29:02.485953', 1),
('onyx', 'Onyx', 'A bold performer with striking features and commanding presence', 'premium', 'uncommon', '/images/avatar/avatars/onyx.png', 5.00, 100, 1, '2025-09-20 11:29:02.485953', '2025-09-20 11:29:02.485953', 0),
('tyler', 'Tyler', 'A versatile entertainer with contemporary appeal and smooth vocals', 'premium', 'uncommon', '/images/avatar/avatars/tyler.png', 5.00, 100, 1, '2025-09-20 11:29:02.485953', '2025-09-20 11:29:02.485953', 0);

-- =====================================================
-- INSERT ALL MICROPHONES (20 total)
-- =====================================================

-- Basic Microphones (Free)
INSERT INTO microphones (id, name, type, rarity, imageUrl, isAvailable, createdAt, updatedAt, price, isUnlockable, unlockRequirement, description, coinPrice, isFree) VALUES
('mic_basic_1', 'Basic Mic Silver', 'basic', 'common', '/images/avatar/parts/microphones/mic_basic_1.png', 1, '2025-09-19 12:48:29.465393', '2025-09-19 16:20:08.705885', 0.00, 0, NULL, 'A reliable silver microphone for beginners', 0, 1),
('mic_basic_2', 'Basic Mic Black', 'basic', 'common', '/images/avatar/parts/microphones/mic_basic_2.png', 1, '2025-09-19 12:48:29.465393', '2025-09-19 16:20:08.705885', 0.00, 0, NULL, 'A sleek black microphone with good sound quality', 0, 1),
('mic_basic_3', 'Basic Mic Blue', 'basic', 'common', '/images/avatar/parts/microphones/mic_basic_3.png', 1, '2025-09-19 12:48:29.465393', '2025-09-19 16:20:08.705885', 0.00, 0, NULL, 'A vibrant blue microphone for those who like color', 0, 1),
('mic_basic_4', 'Basic Mic Red', 'basic', 'common', '/images/avatar/parts/microphones/mic_basic_4.png', 1, '2025-09-19 12:48:29.465393', '2025-09-19 16:20:08.705885', 0.00, 0, NULL, 'A bold red microphone that stands out', 0, 1);

-- Gold Microphones (Uncommon - 100-180 coins)
INSERT INTO microphones (id, name, type, rarity, imageUrl, isAvailable, createdAt, updatedAt, price, isUnlockable, unlockRequirement, description, coinPrice, isFree) VALUES
('mic_gold_1', 'Golden Classic', 'golden', 'uncommon', '/images/avatar/parts/microphones/mic_gold_1.png', 1, '2025-09-19 15:31:55.664349', '2025-09-19 15:31:55.664349', 0.00, 0, NULL, 'A classic golden microphone with warm, rich tones', 100, 0),
('mic_gold_2', 'Gold Performer', 'golden', 'uncommon', '/images/avatar/parts/microphones/mic_gold_2.png', 1, '2025-09-19 15:31:55.664349', '2025-09-19 15:31:55.664349', 0.00, 0, NULL, 'Professional golden microphone for serious performers', 120, 0),
('mic_gold_3', 'Golden Star', 'golden', 'uncommon', '/images/avatar/parts/microphones/mic_gold_3.png', 1, '2025-09-19 15:31:55.664349', '2025-09-19 15:31:55.664349', 0.00, 0, NULL, 'Luxurious golden microphone that makes you shine', 150, 0),
('mic_gold_4', 'Gold Standard', 'golden', 'uncommon', '/images/avatar/parts/microphones/mic_gold_4.png', 1, '2025-09-19 15:31:55.664349', '2025-09-19 15:31:55.664349', 0.00, 0, NULL, 'The gold standard in microphone excellence', 180, 0);

-- Emerald Microphones (Rare - 250-400 coins)
INSERT INTO microphones (id, name, type, rarity, imageUrl, isAvailable, createdAt, updatedAt, price, isUnlockable, unlockRequirement, description, coinPrice, isFree) VALUES
('mic_emerald_1', 'Emerald Elite', 'premium', 'rare', '/images/avatar/parts/microphones/mic_emerald_1.png', 1, '2025-09-19 15:31:55.670474', '2025-09-19 15:31:55.670474', 0.00, 0, NULL, 'An elegant emerald microphone for distinguished performers', 250, 0),
('mic_emerald_2', 'Forest Green Pro', 'premium', 'rare', '/images/avatar/parts/microphones/mic_emerald_2.png', 1, '2025-09-19 15:31:55.670474', '2025-09-19 15:31:55.670474', 0.00, 0, NULL, 'Nature-inspired emerald microphone with crystal-clear sound', 300, 0),
('mic_emerald_3', 'Jade Jewel', 'premium', 'rare', '/images/avatar/parts/microphones/mic_emerald_3.png', 1, '2025-09-19 15:31:55.670474', '2025-09-19 15:31:55.670474', 0.00, 0, NULL, 'A precious emerald microphone with exceptional clarity', 350, 0),
('mic_emerald_4', 'Emerald Crown', 'premium', 'rare', '/images/avatar/parts/microphones/mic_emerald_4.png', 1, '2025-09-19 15:31:55.670474', '2025-09-19 15:31:55.670474', 0.00, 0, NULL, 'Royal emerald microphone fit for a karaoke king', 400, 0);

-- Ruby Microphones (Epic - 500-800 coins)
INSERT INTO microphones (id, name, type, rarity, imageUrl, isAvailable, createdAt, updatedAt, price, isUnlockable, unlockRequirement, description, coinPrice, isFree) VALUES
('mic_ruby_1', 'Ruby Radiance', 'premium', 'epic', '/images/avatar/parts/microphones/mic_ruby_1.png', 1, '2025-09-19 15:31:55.671888', '2025-09-19 15:31:55.671888', 0.00, 0, NULL, 'A stunning ruby microphone that commands attention on stage', 500, 0),
('mic_ruby_2', 'Crimson Crown', 'premium', 'epic', '/images/avatar/parts/microphones/mic_ruby_2.png', 1, '2025-09-19 15:31:55.671888', '2025-09-19 15:31:55.671888', 0.00, 0, NULL, 'Royal ruby microphone with unmatched performance and style', 600, 0),
('mic_ruby_3', 'Scarlet Supreme', 'premium', 'epic', '/images/avatar/parts/microphones/mic_ruby_3.png', 1, '2025-09-19 15:31:55.671888', '2025-09-19 15:31:55.671888', 0.00, 0, NULL, 'Supreme ruby microphone for passionate performers', 700, 0),
('mic_ruby_4', 'Ruby Royalty', 'premium', 'epic', '/images/avatar/parts/microphones/mic_ruby_4.png', 1, '2025-09-19 15:31:55.671888', '2025-09-19 15:31:55.671888', 0.00, 0, NULL, 'The most regal ruby microphone in existence', 800, 0);

-- Diamond Microphones (Legendary - 1000-2000 coins)
INSERT INTO microphones (id, name, type, rarity, imageUrl, isAvailable, createdAt, updatedAt, price, isUnlockable, unlockRequirement, description, coinPrice, isFree) VALUES
('mic_diamond_1', 'Diamond Dynasty', 'premium', 'legendary', '/images/avatar/parts/microphones/mic_diamond_1.png', 1, '2025-09-19 15:31:55.676334', '2025-09-19 15:31:55.676334', 0.00, 0, NULL, 'The ultimate diamond microphone for true karaoke legends', 1000, 0),
('mic_diamond_2', 'Crystal Perfection', 'premium', 'legendary', '/images/avatar/parts/microphones/mic_diamond_2.png', 1, '2025-09-19 15:31:55.676334', '2025-09-19 15:31:55.676334', 0.00, 0, NULL, 'Flawless diamond microphone that delivers perfection in every note', 1200, 0),
('mic_diamond_3', 'Brilliant Star', 'premium', 'legendary', '/images/avatar/parts/microphones/mic_diamond_3.png', 1, '2025-09-19 15:31:55.676334', '2025-09-19 15:31:55.676334', 0.00, 0, NULL, 'A brilliant diamond microphone that outshines all others', 1500, 0),
('mic_diamond_4', 'Diamond Deity', 'premium', 'legendary', '/images/avatar/parts/microphones/mic_diamond_4.png', 1, '2025-09-19 15:31:55.676334', '2025-09-19 15:31:55.676334', 0.00, 0, NULL, 'The most legendary diamond microphone for karaoke gods', 2000, 0);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check avatar count (should be 8)
SELECT COUNT(*) as avatar_count FROM avatars;

-- Check microphone count (should be 20)
SELECT COUNT(*) as microphone_count FROM microphones;

-- Show all avatars with new URLs
SELECT id, name, imageUrl, rarity, coinPrice FROM avatars ORDER BY isFree DESC, coinPrice ASC;

-- Show microphone breakdown by rarity
SELECT rarity, COUNT(*) as count, MIN(coinPrice) as min_price, MAX(coinPrice) as max_price 
FROM microphones 
GROUP BY rarity 
ORDER BY min_price;