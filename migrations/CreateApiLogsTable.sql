-- Create api_logs table for iTunes API monitoring
-- Run this in your MySQL database to set up the logging infrastructure

CREATE TABLE IF NOT EXISTS `api_logs` (
  `id` varchar(36) NOT NULL,
  `provider` enum('ITUNES','SPOTIFY','DEEZER','YOUTUBE') NOT NULL DEFAULT 'ITUNES',
  `logType` enum('REQUEST','RESPONSE','ERROR','RATE_LIMIT','CIRCUIT_BREAKER') NOT NULL,
  `level` enum('INFO','WARN','ERROR','DEBUG') NOT NULL DEFAULT 'INFO',
  `endpoint` varchar(500) DEFAULT NULL,
  `httpMethod` varchar(10) DEFAULT NULL,
  `statusCode` int DEFAULT NULL,
  `responseTime` int DEFAULT NULL,
  `requestData` text,
  `responseData` text,
  `errorMessage` text,
  `userAgent` varchar(500) DEFAULT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userId` varchar(36) DEFAULT NULL,
  `sessionId` varchar(100) DEFAULT NULL,
  `isRateLimit` tinyint(1) NOT NULL DEFAULT '0',
  `rateLimitHeader` varchar(100) DEFAULT NULL,
  `retryAfter` int DEFAULT NULL,
  `circuitBreakerState` enum('CLOSED','OPEN','HALF_OPEN') DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `timestamp` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_provider_timestamp` (`provider`,`timestamp`),
  KEY `IDX_logType_timestamp` (`logType`,`timestamp`),
  KEY `IDX_isRateLimit` (`isRateLimit`),
  KEY `IDX_userId` (`userId`),
  KEY `IDX_endpoint` (`endpoint`),
  KEY `IDX_statusCode` (`statusCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Sample data for testing (optional)
-- INSERT INTO api_logs (id, provider, logType, level, endpoint, httpMethod, statusCode, responseTime, isRateLimit, timestamp)
-- VALUES 
-- (UUID(), 'ITUNES', 'REQUEST', 'INFO', '/search?term=test', 'GET', 200, 150, 0, NOW()),
-- (UUID(), 'ITUNES', 'RATE_LIMIT', 'WARN', '/search?term=test', 'GET', 429, 300, 1, NOW());
