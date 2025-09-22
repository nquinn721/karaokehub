const { exec } = require('child_process');
const path = require('path');

// Database connection details - adjust as needed
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USERNAME || 'postgres', 
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_DATABASE || 'karaokehub'
};

console.log('🔍 Checking for users without default avatars/microphones...');

// SQL to fix users without default avatar/microphone records
const fixQuery = `
-- First, let's see the current state
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_avatars ua ON u.id = ua.userId WHERE ua.userId IS NULL) as users_without_avatars,
  (SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_microphones um ON u.id = um.userId WHERE um.userId IS NULL) as users_without_microphones;

-- Add default avatar records for users who don't have any
INSERT INTO user_avatars (id, userId, baseAvatarId, isActive, createdAt, updatedAt)
SELECT 
  gen_random_uuid(),
  u.id,
  (SELECT id FROM avatars WHERE isFree = true AND isAvailable = true ORDER BY id LIMIT 1),
  true,
  NOW(),
  NOW()
FROM users u
LEFT JOIN user_avatars ua ON u.id = ua.userId
WHERE ua.userId IS NULL
  AND EXISTS (SELECT 1 FROM avatars WHERE isFree = true AND isAvailable = true);

-- Add default microphone records for users who don't have any
INSERT INTO user_microphones (id, userId, microphoneId, acquiredAt)
SELECT 
  gen_random_uuid(),
  u.id,
  (SELECT id FROM microphones WHERE isFree = true AND isAvailable = true ORDER BY id LIMIT 1),
  NOW()
FROM users u
LEFT JOIN user_microphones um ON u.id = um.userId
WHERE um.userId IS NULL
  AND EXISTS (SELECT 1 FROM microphones WHERE isFree = true AND isAvailable = true);

-- Update users who don't have equipped avatars
UPDATE users 
SET equippedAvatarId = (SELECT id FROM avatars WHERE isFree = true AND isAvailable = true ORDER BY id LIMIT 1)
WHERE equippedAvatarId IS NULL
  AND EXISTS (SELECT 1 FROM avatars WHERE isFree = true AND isAvailable = true);

-- Update users who don't have equipped microphones  
UPDATE users 
SET equippedMicrophoneId = (SELECT id FROM microphones WHERE isFree = true AND isAvailable = true ORDER BY id LIMIT 1)
WHERE equippedMicrophoneId IS NULL
  AND EXISTS (SELECT 1 FROM microphones WHERE isFree = true AND isAvailable = true);

-- Show the results
SELECT 
  (SELECT COUNT(*) FROM users) as total_users_after,
  (SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_avatars ua ON u.id = ua.userId WHERE ua.userId IS NULL) as users_without_avatars_after,
  (SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_microphones um ON u.id = um.userId WHERE um.userId IS NULL) as users_without_microphones_after,
  (SELECT COUNT(*) FROM users WHERE equippedAvatarId IS NULL OR equippedMicrophoneId IS NULL) as users_without_equipped_items_after;
`;

console.log('📝 SQL Query to execute:');
console.log(fixQuery);
console.log('\n🚨 IMPORTANT: Please run this SQL manually in your database management tool or using:');
console.log('psql -h localhost -U postgres -d karaokehub -c "' + fixQuery.replace(/"/g, '\\"') + '"');
console.log('\nThis will:');
console.log('1. ✅ Add default avatar records for users who have none');
console.log('2. ✅ Add default microphone records for users who have none'); 
console.log('3. ✅ Set equipped avatar for users who have none equipped');
console.log('4. ✅ Set equipped microphone for users who have none equipped');
console.log('\n📊 The query will show before/after counts to confirm the fix worked.');