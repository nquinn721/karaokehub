-- Migration: Create API Logs Table
-- Description: Creates the api_logs table for monitoring iTunes API usage and rate limiting
-- Date: 2025-09-18

CREATE TABLE `api_logs` (
  `id` varchar(36) NOT NULL,
  `provider` enum('itunes') NOT NULL,
  `logType` enum('search_songs','search_artists','snippet_request','rate_limited','circuit_breaker','api_error') NOT NULL,
  `level` enum('info','warn','error') NOT NULL DEFAULT 'info',
  `message` text,
  `requestData` json,
  `responseData` json,
  `errorDetails` json,
  `statusCode` int,
  `responseTime` int,
  `query` varchar(500),
  `userAgent` varchar(100),
  `ipAddress` varchar(45),
  `userId` varchar(36),
  `rateLimitRemaining` int,
  `rateLimitReset` timestamp NULL,
  `wasRateLimited` tinyint(1) NOT NULL DEFAULT '0',
  `circuitBreakerTripped` tinyint(1) NOT NULL DEFAULT '0',
  `timestamp` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_provider_timestamp` (`provider`, `timestamp`),
  KEY `IDX_logType_timestamp` (`logType`, `timestamp`),
  KEY `IDX_level_timestamp` (`level`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
