-- Update all existing avatars to be common rarity and available
-- This script will:
-- 1. Set all avatars to 'common' rarity
-- 2. Make all avatars available (isAvailable = true)
-- 3. Set appropriate coin prices for common avatars

-- First, let's see what we're working with
SELECT 'BEFORE UPDATE - Current avatar status:' as status;
SELECT 
    rarity,
    COUNT(*) as count,
    AVG(coinPrice) as avg_coin_price,
    SUM(CASE WHEN isAvailable = 1 THEN 1 ELSE 0 END) as available_count
FROM avatars 
GROUP BY rarity;

-- Update all avatars to common rarity and make them available
UPDATE avatars 
SET 
    rarity = 'common',
    isAvailable = true,
    coinPrice = CASE 
        WHEN isFree = true THEN 0
        WHEN coinPrice = 0 AND isFree = false THEN 10  -- Set reasonable coin price for common avatars
        ELSE coinPrice  -- Keep existing coin price if already set
    END,
    updatedAt = NOW()
WHERE 1=1;

-- Show results after update
SELECT 'AFTER UPDATE - Updated avatar status:' as status;
SELECT 
    rarity,
    COUNT(*) as count,
    AVG(coinPrice) as avg_coin_price,
    SUM(CASE WHEN isAvailable = 1 THEN 1 ELSE 0 END) as available_count,
    SUM(CASE WHEN isFree = 1 THEN 1 ELSE 0 END) as free_count
FROM avatars 
GROUP BY rarity;

-- Show all avatars after update
SELECT 
    id,
    name,
    rarity,
    coinPrice,
    isAvailable,
    isFree
FROM avatars 
ORDER BY isFree DESC, coinPrice ASC, name ASC;