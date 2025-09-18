-- Seed microphones
INSERT INTO microphones (id, name, description, type, rarity, imageUrl, cost, unlockLevel, isAvailable, createdAt, updatedAt) VALUES
(UUID(), 'Classic Silver', 'A timeless silver microphone', 'basic', 'common', '/microphones/classic_silver.png', 0, 1, 1, NOW(), NOW()),
(UUID(), 'Golden Mic', 'Luxurious gold-plated microphone', 'golden', 'rare', '/microphones/golden_mic.png', 100, 5, 1, NOW(), NOW()),
(UUID(), 'Ruby Red', 'Modern red microphone', 'modern', 'uncommon', '/microphones/ruby_red.png', 50, 3, 1, NOW(), NOW()),
(UUID(), 'Ocean Blue', 'Cool blue modern microphone', 'modern', 'common', '/microphones/ocean_blue.png', 25, 2, 1, NOW(), NOW()),
(UUID(), 'Forest Green', 'Vintage green microphone', 'vintage', 'uncommon', '/microphones/forest_green.png', 75, 4, 1, NOW(), NOW()),
(UUID(), 'Purple Haze', 'Modern purple microphone', 'modern', 'rare', '/microphones/purple_haze.png', 125, 6, 1, NOW(), NOW()),
(UUID(), 'Sunset Orange', 'Wireless orange microphone', 'wireless', 'epic', '/microphones/sunset_orange.png', 200, 8, 1, NOW(), NOW()),
(UUID(), 'Midnight Black', 'Sleek black modern microphone', 'modern', 'uncommon', '/microphones/midnight_black.png', 60, 3, 1, NOW(), NOW()),
(UUID(), 'Rose Gold', 'Premium rose gold microphone', 'premium', 'epic', '/microphones/rose_gold.png', 300, 10, 1, NOW(), NOW()),
(UUID(), 'Electric Blue', 'Legendary electric blue microphone', 'wireless', 'legendary', '/microphones/electric_blue.png', 500, 15, 1, NOW(), NOW());

-- Seed outfits
INSERT INTO outfits (id, name, description, type, rarity, imageUrl, cost, unlockLevel, isAvailable, createdAt, updatedAt) VALUES
(UUID(), 'Classic Tux', 'Traditional black tuxedo', 'formal', 'common', '/outfits/classic_tux.png', 0, 1, 1, NOW(), NOW()),
(UUID(), 'Casual Denim', 'Comfortable denim outfit', 'casual', 'common', '/outfits/casual_denim.png', 25, 1, 1, NOW(), NOW()),
(UUID(), 'Rock Star Leather', 'Edgy leather stage outfit', 'stage', 'rare', '/outfits/rock_star_leather.png', 150, 7, 1, NOW(), NOW()),
(UUID(), 'Pop Star Sparkle', 'Glittery pop performance outfit', 'stage', 'epic', '/outfits/pop_star_sparkle.png', 250, 12, 1, NOW(), NOW()),
(UUID(), 'Country Western', 'Classic western style', 'casual', 'uncommon', '/outfits/country_western.png', 75, 4, 1, NOW(), NOW()),
(UUID(), 'Hip Hop Style', 'Urban streetwear outfit', 'modern', 'uncommon', '/outfits/hip_hop_style.png', 100, 5, 1, NOW(), NOW()),
(UUID(), 'Vintage Vegas', 'Retro Las Vegas performer outfit', 'vintage', 'rare', '/outfits/vintage_vegas.png', 200, 8, 1, NOW(), NOW()),
(UUID(), 'Modern Minimalist', 'Clean modern design', 'modern', 'common', '/outfits/modern_minimalist.png', 50, 2, 1, NOW(), NOW()),
(UUID(), 'Rainbow Pride', 'Colorful pride outfit', 'fantasy', 'rare', '/outfits/rainbow_pride.png', 175, 6, 1, NOW(), NOW()),
(UUID(), 'Elegant Evening', 'Sophisticated evening wear', 'formal', 'legendary', '/outfits/elegant_evening.png', 500, 20, 1, NOW(), NOW());

-- Seed shoes
INSERT INTO shoes (id, name, description, type, rarity, imageUrl, cost, unlockLevel, isAvailable, createdAt, updatedAt) VALUES
(UUID(), 'Classic Black', 'Traditional black dress shoes', 'dress', 'common', '/shoes/classic_black.png', 0, 1, 1, NOW(), NOW()),
(UUID(), 'White Sneakers', 'Comfortable white sneakers', 'sneakers', 'common', '/shoes/white_sneakers.png', 25, 1, 1, NOW(), NOW()),
(UUID(), 'Red High Tops', 'Stylish red high-top sneakers', 'sneakers', 'uncommon', '/shoes/red_high_tops.png', 50, 3, 1, NOW(), NOW()),
(UUID(), 'Brown Boots', 'Rugged brown leather boots', 'boots', 'uncommon', '/shoes/brown_boots.png', 75, 4, 1, NOW(), NOW()),
(UUID(), 'Silver Dance', 'Professional dance shoes', 'dress', 'rare', '/shoes/silver_dance.png', 125, 6, 1, NOW(), NOW()),
(UUID(), 'Gold Glitter', 'Sparkling gold performance shoes', 'heels', 'epic', '/shoes/gold_glitter.png', 200, 10, 1, NOW(), NOW()),
(UUID(), 'Blue Canvas', 'Casual blue canvas shoes', 'sneakers', 'common', '/shoes/blue_canvas.png', 30, 1, 1, NOW(), NOW()),
(UUID(), 'Pink Platform', 'High platform performance shoes', 'platform', 'rare', '/shoes/pink_platform.png', 150, 7, 1, NOW(), NOW()),
(UUID(), 'Green Glow', 'Neon green athletic shoes', 'sneakers', 'epic', '/shoes/green_glow.png', 250, 12, 1, NOW(), NOW()),
(UUID(), 'Purple Velvet', 'Luxurious purple velvet shoes', 'dress', 'legendary', '/shoes/purple_velvet.png', 400, 18, 1, NOW(), NOW());

-- Create UserAvatar records for all existing users with default items
INSERT INTO user_avatars (id, userId, baseAvatarId, microphoneId, outfitId, shoesId, isActive, createdAt, updatedAt)
SELECT 
    UUID() as id,
    u.id as userId,
    'avatar_1' as baseAvatarId,
    (SELECT id FROM microphones WHERE name = 'Classic Silver' LIMIT 1) as microphoneId,
    (SELECT id FROM outfits WHERE name = 'Classic Tux' LIMIT 1) as outfitId,
    (SELECT id FROM shoes WHERE name = 'Classic Black' LIMIT 1) as shoesId,
    1 as isActive,
    NOW() as createdAt,
    NOW() as updatedAt
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_avatars ua WHERE ua.userId = u.id);
