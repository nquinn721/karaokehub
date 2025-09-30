-- Database Schema Fix for API Monitoring
-- Run this script when ready to fix the avgResponseTime column precision issue
-- 
-- Problem: avgResponseTime column is DECIMAL(10,2) but needs to handle larger values
-- Solution: Change to DECIMAL(15,4) to handle values up to 99,999,999,999.9999
--
-- IMPORTANT: Test this on a staging environment first!

USE `karaoke-hub`;

-- Check current column definition
SHOW CREATE TABLE api_metrics_daily;

-- Fix the avgResponseTime column precision
ALTER TABLE api_metrics_daily 
MODIFY COLUMN avgResponseTime DECIMAL(15,4) NOT NULL DEFAULT 0;

-- Verify the change
DESCRIBE api_metrics_daily;

-- Optional: Check if there are any existing problematic values
SELECT id, avgResponseTime, totalCalls, totalResponseTime, 
       (totalResponseTime / totalCalls) as calculated_avg
FROM api_metrics_daily 
WHERE totalCalls > 0
ORDER BY avgResponseTime DESC 
LIMIT 10;