-- Migration to rename favorites table to favorite_shows
-- Generated on 2025-08-22

ALTER TABLE favorites RENAME TO favorite_shows;

-- Update any indexes or constraints if they exist
-- Note: Check if there are any foreign key constraints that need updating
