-- Migration: Redesign ownership vs equipment pattern
-- This migration implements the new pattern where:
-- 1. Users have direct FK references to equipped items
-- 2. Ownership tables only store purchased items (no free items)
-- 3. Items are marked as free/premium with isFree field

-- Step 1: Add equipped item fields to users table
ALTER TABLE users 
  ADD COLUMN equippedAvatarId VARCHAR(50) NULL,
  ADD COLUMN equippedMicrophoneId VARCHAR(255) NULL;

-- Step 2: Add foreign key constraints
ALTER TABLE users 
  ADD CONSTRAINT FK_users_equippedAvatar 
    FOREIGN KEY (equippedAvatarId) REFERENCES avatars(id) ON DELETE SET NULL,
  ADD CONSTRAINT FK_users_equippedMicrophone 
    FOREIGN KEY (equippedMicrophoneId) REFERENCES microphones(id) ON DELETE SET NULL;

-- Step 3: Add isFree fields to item tables
ALTER TABLE avatars ADD COLUMN isFree BOOLEAN DEFAULT true;
ALTER TABLE microphones ADD COLUMN isFree BOOLEAN DEFAULT false;

-- Step 4: Mark basic items as free
UPDATE avatars SET isFree = true WHERE type = 'basic' OR rarity = 'common';
UPDATE microphones SET isFree = true WHERE type = 'basic' OR rarity = 'common';

-- Step 5: Migrate existing equipped items to new pattern
-- First, migrate equipped avatars
UPDATE users u 
JOIN user_avatars ua ON u.id = ua.userId AND ua.isEquipped = 1
SET u.equippedAvatarId = ua.avatarId;

-- Then, migrate equipped microphones  
UPDATE users u
JOIN user_microphones um ON u.id = um.userId AND um.isEquipped = 1
SET u.equippedMicrophoneId = um.microphoneId;

-- Step 6: Remove equipment tracking from ownership tables
ALTER TABLE user_avatars DROP COLUMN isEquipped;
ALTER TABLE user_microphones DROP COLUMN isEquipped, DROP COLUMN updatedAt;

-- Step 7: Remove ownership records for free items (clean up DB)
-- Delete user_avatar records for free avatars
DELETE ua FROM user_avatars ua
JOIN avatars a ON ua.avatarId = a.id
WHERE a.isFree = true;

-- Delete user_microphone records for free microphones
DELETE um FROM user_microphones um
JOIN microphones m ON um.microphoneId = m.id  
WHERE m.isFree = true;

-- Step 8: Remove indexes that referenced isEquipped
ALTER TABLE user_avatars DROP INDEX IDX_user_avatars_userId_isEquipped;