-- Store System Setup
-- Add coins column to users table and create store-related tables

-- Add coins to users table (check if column exists first)
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

-- Create coin_packages table
CREATE TABLE IF NOT EXISTS coin_packages (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    coinAmount INT NOT NULL,
    priceUSD DECIMAL(8,2) NOT NULL,
    bonusCoins INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    sortOrder INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    type ENUM('coin_purchase', 'microphone_purchase', 'reward', 'refund') NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    coinAmount INT NOT NULL,
    priceUSD DECIMAL(8,2) NULL,
    stripePaymentIntentId VARCHAR(255) NULL,
    coinPackageId VARCHAR(36) NULL,
    microphoneId VARCHAR(36) NULL,
    description TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coinPackageId) REFERENCES coin_packages(id),
    FOREIGN KEY (microphoneId) REFERENCES microphones(id)
);

-- Add coinPrice to microphones table (check if column exists first)
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

-- Insert coin packages
INSERT IGNORE INTO coin_packages (id, name, description, coinAmount, priceUSD, bonusCoins, sortOrder) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'Starter Pack', 'Perfect for trying out the store', 100, 0.99, 0, 1),
('550e8400-e29b-41d4-a716-446655440011', 'Small Pack', 'Get some extra coins', 250, 1.99, 25, 2),
('550e8400-e29b-41d4-a716-446655440012', 'Medium Pack', 'Popular choice with bonus coins', 600, 4.99, 100, 3),
('550e8400-e29b-41d4-a716-446655440013', 'Large Pack', 'Great value with extra bonus', 1300, 9.99, 300, 4),
('550e8400-e29b-41d4-a716-446655440014', 'Mega Pack', 'Maximum value for serious players', 2800, 19.99, 700, 5);

-- Update existing microphones with coin prices
UPDATE microphones SET coinPrice = 50 WHERE rarity = 'common' AND coinPrice = 0;
UPDATE microphones SET coinPrice = 150 WHERE rarity = 'uncommon' AND coinPrice = 0;
UPDATE microphones SET coinPrice = 300 WHERE rarity = 'rare' AND coinPrice = 0;
UPDATE microphones SET coinPrice = 500 WHERE rarity = 'epic' AND coinPrice = 0;
UPDATE microphones SET coinPrice = 1000 WHERE rarity = 'legendary' AND coinPrice = 0;

-- Give all existing users some starting coins
UPDATE users SET coins = 250 WHERE coins = 0;