-- Check current avatars in the database
SELECT 
    id,
    name,
    description,
    type,
    rarity,
    imageUrl,
    price,
    coinPrice,
    isAvailable,
    isFree,
    createdAt
FROM avatars 
ORDER BY createdAt ASC;

-- Count avatars by rarity
SELECT 
    rarity,
    COUNT(*) as count,
    SUM(CASE WHEN isAvailable = 1 THEN 1 ELSE 0 END) as available_count,
    SUM(CASE WHEN isFree = 1 THEN 1 ELSE 0 END) as free_count
FROM avatars 
GROUP BY rarity;

-- Check if any avatars are not available
SELECT 
    id,
    name,
    rarity,
    isAvailable,
    isFree
FROM avatars 
WHERE isAvailable = 0 OR isFree = 0;