-- Insert test data for API monitoring dashboard

-- Insert daily metrics for the last few days
INSERT INTO api_metrics_daily (id, date, provider, endpointType, totalCalls, successCount, errorCount, rateLimitHits, avgResponseTime, minResponseTime, maxResponseTime, totalResponseTime, createdAt, updatedAt) VALUES
-- Today
(UUID(), DATE(NOW()), 'itunes', 'search', 45, 42, 3, 1, 120, 85, 250, 5400, NOW(), NOW()),
-- Yesterday  
(UUID(), DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)), 'itunes', 'search', 67, 64, 3, 0, 110, 75, 280, 7370, NOW(), NOW()),
-- 2 days ago
(UUID(), DATE(DATE_SUB(NOW(), INTERVAL 2 DAY)), 'itunes', 'search', 52, 49, 3, 2, 130, 90, 320, 6760, NOW(), NOW()),
-- 3 days ago
(UUID(), DATE(DATE_SUB(NOW(), INTERVAL 3 DAY)), 'itunes', 'search', 38, 36, 2, 0, 105, 80, 200, 3990, NOW(), NOW()),
-- 4 days ago
(UUID(), DATE(DATE_SUB(NOW(), INTERVAL 4 DAY)), 'itunes', 'search', 29, 28, 1, 0, 95, 70, 150, 2755, NOW(), NOW()),
-- 5 days ago
(UUID(), DATE(DATE_SUB(NOW(), INTERVAL 5 DAY)), 'itunes', 'search', 41, 39, 2, 1, 115, 85, 220, 4715, NOW(), NOW()),
-- 6 days ago
(UUID(), DATE(DATE_SUB(NOW(), INTERVAL 6 DAY)), 'itunes', 'search', 33, 31, 2, 0, 100, 75, 180, 3300, NOW(), NOW());

-- Insert some test issues
INSERT INTO api_issues (id, timestamp, provider, endpointType, issueType, requestUrl, requestHeaders, responseStatus, responseTime, errorCode, errorMessage, requestDetails, responseDetails, isResolved, createdAt, updatedAt) VALUES
-- Recent rate limit issue
(UUID(), DATE_SUB(NOW(), INTERVAL 2 HOUR), 'itunes', 'search', 'rate_limit', 'https://itunes.apple.com/search?term=love&entity=song&limit=20&media=music', '{"User-Agent": "KaraokeRatingsApp/1.0.0"}', 429, 150, '429', 'Rate limit exceeded', '{"query": "love", "entity": "song", "limit": 20}', '{"error": "Rate limit exceeded"}', false, NOW(), NOW()),

-- API error from yesterday
(UUID(), DATE_SUB(NOW(), INTERVAL 1 DAY), 'itunes', 'search', 'api_error', 'https://itunes.apple.com/search?term=rock&entity=song&limit=20&media=music', '{"User-Agent": "KaraokeRatingsApp/1.0.0"}', 500, 200, '500', 'Internal server error', '{"query": "rock", "entity": "song", "limit": 20}', '{"error": "Internal server error"}', true, NOW(), NOW()),

-- Timeout error from 2 days ago  
(UUID(), DATE_SUB(NOW(), INTERVAL 2 DAY), 'itunes', 'search', 'timeout', 'https://itunes.apple.com/search?term=jazz&entity=song&limit=20&media=music', '{"User-Agent": "KaraokeRatingsApp/1.0.0"}', 0, 10000, 'TIMEOUT', 'Request timeout', '{"query": "jazz", "entity": "song", "limit": 20}', '{"error": "Request timeout after 10s"}', true, NOW(), NOW());

SELECT 'Test data inserted successfully!' as message;
SELECT COUNT(*) as total_metrics FROM api_metrics_daily;
SELECT COUNT(*) as total_issues FROM api_issues;