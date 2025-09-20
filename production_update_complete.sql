-- KaraokeHub Production Database Update
-- This script updates the production database with new tables and data for:
-- 1. Avatar system (avatars, user_avatars)
-- 2. Microphone system (microphones, user_microphones) 
-- 3. Coin/Store system (coin_packages, transactions)

-- Add coins column to users table if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'users' 
     AND column_name = 'coins') > 0,
    'SELECT "Column coins already exists"',
    'ALTER TABLE users ADD COLUMN coins INT DEFAULT 0'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create avatars table
CREATE TABLE IF NOT EXISTS `avatars` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `type` varchar(50) NOT NULL,
  `rarity` varchar(50) NOT NULL DEFAULT 'common',
  `imageUrl` varchar(500) NOT NULL,
  `price` decimal(8,2) NOT NULL DEFAULT '0.00',
  `coinPrice` int NOT NULL DEFAULT '0',
  `isAvailable` tinyint NOT NULL DEFAULT '1',
  `isFree` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create user_avatars table
CREATE TABLE IF NOT EXISTS `user_avatars` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `avatarId` varchar(50) NOT NULL,
  `isEquipped` tinyint NOT NULL DEFAULT '0',
  `acquiredAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_user_avatars_userId` (`userId`),
  KEY `IDX_user_avatars_avatarId` (`avatarId`),
  KEY `FK_user_avatars_avatarId` (`avatarId`),
  CONSTRAINT `FK_user_avatars_avatarId` FOREIGN KEY (`avatarId`) REFERENCES `avatars` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_user_avatars_userId` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add coinPrice column to microphones table if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'microphones' 
     AND column_name = 'coinPrice') > 0,
    'SELECT "Column coinPrice already exists"',
    'ALTER TABLE microphones ADD COLUMN coinPrice INT DEFAULT 0'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add isFree column to microphones table if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'microphones' 
     AND column_name = 'isFree') > 0,
    'SELECT "Column isFree already exists"',
    'ALTER TABLE microphones ADD COLUMN isFree TINYINT DEFAULT 0'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create coin_packages table
CREATE TABLE IF NOT EXISTS `coin_packages` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `coinAmount` int NOT NULL,
  `priceUSD` decimal(8,2) NOT NULL,
  `bonusCoins` int NOT NULL DEFAULT '0',
  `isActive` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create transactions table
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `type` enum('coin_purchase','microphone_purchase','reward','refund') NOT NULL,
  `status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `coinAmount` int NOT NULL,
  `priceUSD` decimal(8,2) DEFAULT NULL,
  `stripePaymentIntentId` varchar(255) DEFAULT NULL,
  `stripeSessionId` varchar(255) DEFAULT NULL,
  `coinPackageId` varchar(36) DEFAULT NULL,
  `microphoneId` varchar(36) DEFAULT NULL,
  `description` text,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_transactions_userId` (`userId`),
  KEY `IDX_transactions_type` (`type`),
  KEY `IDX_transactions_createdAt` (`createdAt`),
  KEY `FK_transactions_coinPackageId` (`coinPackageId`),
  CONSTRAINT `FK_transactions_coinPackageId` FOREIGN KEY (`coinPackageId`) REFERENCES `coin_packages` (`id`),
  CONSTRAINT `FK_transactions_userId` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert avatar data
INSERT IGNORE INTO `avatars` (`id`, `name`, `description`, `type`, `rarity`, `imageUrl`, `price`, `coinPrice`, `isAvailable`, `createdAt`, `updatedAt`, `isFree`) VALUES 
('alex','Alex','A friendly and versatile performer with a warm personality','basic','common','/images/avatar/avatars/alex.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1),
('blake','Blake','A confident artist with modern style and great stage presence','basic','common','/images/avatar/avatars/blake.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1),
('cameron','Cameron','A dynamic performer with classic appeal and natural charisma','basic','common','/images/avatar/avatars/cameron.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1),
('joe','Joe','A reliable and steady performer with authentic charm','basic','common','/images/avatar/avatars/joe.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1),
('juan','Juan','A passionate singer with vibrant energy and cultural flair','basic','common','/images/avatar/avatars/juan.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1),
('kai','Kai','A creative artist with unique style and artistic vision','basic','common','/images/avatar/avatars/kai.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1),
('onyx','Onyx','A bold performer with striking features and commanding presence','premium','uncommon','/images/avatar/avatars/onyx.png',5.00,100,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',0),
('tyler','Tyler','A versatile entertainer with contemporary appeal and smooth vocals','premium','uncommon','/images/avatar/avatars/tyler.png',5.00,100,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',0);

-- Update microphone data with coin prices and free status
UPDATE microphones SET coinPrice = 0, isFree = 1 WHERE id IN ('mic_basic_1', 'mic_basic_2', 'mic_basic_3', 'mic_basic_4');
UPDATE microphones SET coinPrice = 100, isFree = 0 WHERE id IN ('mic_gold_1', 'mic_gold_2', 'mic_gold_3', 'mic_gold_4');
UPDATE microphones SET coinPrice = 250, isFree = 0 WHERE id IN ('mic_emerald_1', 'mic_emerald_2', 'mic_emerald_3', 'mic_emerald_4');
UPDATE microphones SET coinPrice = 500, isFree = 0 WHERE id IN ('mic_ruby_1', 'mic_ruby_2', 'mic_ruby_3', 'mic_ruby_4');
UPDATE microphones SET coinPrice = 1000, isFree = 0 WHERE id = 'mic_diamond_1';
UPDATE microphones SET coinPrice = 1200, isFree = 0 WHERE id = 'mic_diamond_2';
UPDATE microphones SET coinPrice = 1500, isFree = 0 WHERE id = 'mic_diamond_3';
UPDATE microphones SET coinPrice = 2000, isFree = 0 WHERE id = 'mic_diamond_4';

-- Insert coin package data
INSERT IGNORE INTO `coin_packages` (`id`, `name`, `coinAmount`, `priceUSD`, `bonusCoins`, `isActive`, `sortOrder`, `description`, `createdAt`, `updatedAt`) VALUES 
('550e8400-e29b-41d4-a716-446655440010','Starter Pack',100,0.99,0,1,1,'Perfect for trying out the store','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319'),
('550e8400-e29b-41d4-a716-446655440011','Small Pack',250,1.99,25,1,2,'Get some extra coins with bonus','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319'),
('550e8400-e29b-41d4-a716-446655440012','Medium Pack',600,4.99,100,1,3,'Popular choice with good bonus coins','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319'),
('550e8400-e29b-41d4-a716-446655440013','Large Pack',1300,9.99,300,1,4,'Great value with lots of bonus coins','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319'),
('550e8400-e29b-41d4-a716-446655440014','Mega Pack',2800,19.99,700,1,5,'Best value with maximum bonus coins','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319');

-- Create default user avatars for existing users (give them alex avatar by default)
INSERT IGNORE INTO user_avatars (id, userId, avatarId, isEquipped, acquiredAt)
SELECT UUID(), id, 'alex', 1, NOW()
FROM users 
WHERE NOT EXISTS (
    SELECT 1 FROM user_avatars WHERE user_avatars.userId = users.id
);

-- Create default user microphones for existing users (give them basic mic by default)
INSERT IGNORE INTO user_microphones (id, userId, microphoneId, isEquipped, acquiredAt)
SELECT UUID(), id, 'mic_basic_1', 1, NOW()
FROM users 
WHERE NOT EXISTS (
    SELECT 1 FROM user_microphones WHERE user_microphones.userId = users.id
);

-- Give existing users some starting coins (100 coins)
UPDATE users SET coins = 100 WHERE coins = 0 OR coins IS NULL;

SELECT 'Production database update completed successfully!' as status;