-- KaraokeHub Database Initialization
-- This file is automatically loaded when the MySQL container starts

USE `karaoke-hub`;

-- Set timezone
SET time_zone = '+00:00';

-- Create a sample vendor
INSERT INTO vendors (id, name, owner, website, instagram, facebook, isActive, createdAt, updatedAt)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Downtown Karaoke',
  'John Doe',
  'https://downtownkaraoke.com',
  '@downtownkaraoke',
  'downtownkaraoke',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE id=id;

-- Create a sample KJ
INSERT INTO kjs (id, name, vendorId, isActive, createdAt, updatedAt)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'Mike the Music Master',
  '550e8400-e29b-41d4-a716-446655440001',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE id=id;

-- Create sample shows
INSERT INTO shows (id, vendorId, kjId, address, day, startTime, endTime, description, isActive, createdAt, updatedAt)
VALUES 
(
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '123 Main St, Downtown',
  'friday',
  '19:00:00',
  '23:00:00',
  'Friday Night Karaoke - All your favorite hits!',
  1,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '123 Main St, Downtown',
  'saturday',
  '20:00:00',
  '02:00:00',
  'Saturday Night Karaoke - Party all night!',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE id=id;
