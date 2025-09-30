-- Add search context columns to api_recent_calls table
-- This migration adds searchType and searchContext columns to track search origins

ALTER TABLE api_recent_calls 
ADD COLUMN searchType VARCHAR(50) DEFAULT NULL COMMENT 'Type of search: featured_category, user_typed, etc.',
ADD COLUMN searchContext VARCHAR(255) DEFAULT NULL COMMENT 'Additional context about the search origin';

-- Add index for better query performance on searchType
CREATE INDEX idx_api_recent_calls_search_type ON api_recent_calls(searchType);

-- Update existing records to have NULL values (which is the default)
-- No data update needed as new columns default to NULL