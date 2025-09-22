-- Add city and state columns to urls_to_parse table
ALTER TABLE urls_to_parse 
ADD COLUMN city VARCHAR(100) NULL,
ADD COLUMN state VARCHAR(50) NULL;

-- Add index for better query performance
CREATE INDEX idx_urls_to_parse_city_state ON urls_to_parse(city, state);
