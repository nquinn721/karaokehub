-- Add redemption and expiry fields to coin_packages table

ALTER TABLE coin_packages 
ADD COLUMN maxRedemptions INT DEFAULT NULL,
ADD COLUMN currentRedemptions INT DEFAULT 0,
ADD COLUMN expiryDate DATETIME DEFAULT NULL,
ADD COLUMN isLimitedTime BOOLEAN DEFAULT FALSE,
ADD COLUMN isOneTimeUse BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX idx_coin_packages_expiry ON coin_packages(expiryDate);
CREATE INDEX idx_coin_packages_limited_time ON coin_packages(isLimitedTime);
CREATE INDEX idx_coin_packages_one_time_use ON coin_packages(isOneTimeUse);

-- Update current redemptions to 0 for all existing packages
UPDATE coin_packages SET currentRedemptions = 0 WHERE currentRedemptions IS NULL;