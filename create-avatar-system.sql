-- Create avatars table
CREATE TABLE avatars (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'basic',
    rarity VARCHAR(50) NOT NULL DEFAULT 'common',
    imageUrl VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    coinPrice INT NOT NULL DEFAULT 0,
    isAvailable BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create user_avatars table for user ownership
CREATE TABLE user_avatars (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    userId VARCHAR(36) NOT NULL,
    avatarId VARCHAR(50) NOT NULL,
    isEquipped BOOLEAN NOT NULL DEFAULT FALSE,
    acquiredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (avatarId) REFERENCES avatars(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_avatar (userId, avatarId),
    INDEX idx_user_avatars_user (userId),
    INDEX idx_user_avatars_equipped (userId, isEquipped)
);

-- Insert basic avatars (making them match the current avatar selection)
INSERT INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable) VALUES
('avatar_alex', 'Alex', 'A friendly and approachable performer', 'basic', 'common', '/images/avatar/avatar_1.png', 0.00, 0, TRUE),
('avatar_sam', 'Sam', 'A confident and charismatic singer', 'basic', 'common', '/images/avatar/avatar_2.png', 0.00, 0, TRUE),
('avatar_jordan', 'Jordan', 'A versatile artist with great stage presence', 'basic', 'common', '/images/avatar/avatar_3.png', 0.00, 0, TRUE),
('avatar_taylor', 'Taylor', 'A dynamic performer who loves the spotlight', 'basic', 'common', '/images/avatar/avatar_4.png', 0.00, 0, TRUE),
('avatar_casey', 'Casey', 'A smooth vocalist with natural rhythm', 'basic', 'common', '/images/avatar/avatar_5.png', 0.00, 0, TRUE),
('avatar_robin', 'Robin', 'An energetic performer who brings the party', 'basic', 'common', '/images/avatar/avatar_6.png', 0.00, 0, TRUE),
('avatar_morgan', 'Morgan', 'A soulful singer with emotional depth', 'basic', 'common', '/images/avatar/avatar_7.png', 0.00, 0, TRUE),
('avatar_riley', 'Riley', 'A fun-loving karaoke enthusiast', 'basic', 'common', '/images/avatar/avatar_8.png', 0.00, 0, TRUE);

-- Give all existing users access to all basic avatars
INSERT INTO user_avatars (userId, avatarId, isEquipped)
SELECT 
    u.id as userId,
    a.id as avatarId,
    CASE 
        WHEN a.id = 'avatar_jordan' THEN TRUE  -- Default to Jordan as equipped
        ELSE FALSE 
    END as isEquipped
FROM users u
CROSS JOIN avatars a
WHERE a.type = 'basic'
ON DUPLICATE KEY UPDATE isEquipped = VALUES(isEquipped);