-- Add redemption and expiry fields to coin_packages table
-- Migration: Add short-term and one-time redemption features

ALTER TABLE coin_packages 
ADD COLUMN maxRedemptions INT NULL COMMENT 'Maximum number of redemptions allowed (NULL = unlimited)',
ADD COLUMN currentRedemptions INT DEFAULT 0 NOT NULL COMMENT 'Current number of redemptions used',
ADD COLUMN expiryDate TIMESTAMP NULL COMMENT 'Package expiry date (NULL = never expires)',
ADD COLUMN isLimitedTime BOOLEAN DEFAULT FALSE NOT NULL COMMENT 'Flag for limited-time offers',
ADD COLUMN isOneTimeUse BOOLEAN DEFAULT FALSE NOT NULL COMMENT 'Flag for one-time use packages';

-- Add indexes for better query performance
CREATE INDEX idx_coin_packages_expiry ON coin_packages(expiryDate);
CREATE INDEX idx_coin_packages_limited_time ON coin_packages(isLimitedTime);
CREATE INDEX idx_coin_packages_one_time ON coin_packages(isOneTimeUse);
CREATE INDEX idx_coin_packages_redemptions ON coin_packages(maxRedemptions, currentRedemptions);

-- Update existing packages to ensure they work with new fields
UPDATE coin_packages 
SET currentRedemptions = 0, isLimitedTime = FALSE, isOneTimeUse = FALSE 
WHERE currentRedemptions IS NULL;