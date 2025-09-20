-- Fix coin packages in production to match local database exactly
-- This script will clear and re-insert the correct 5 coin packages

-- First, delete any existing coin packages to avoid conflicts
DELETE FROM coin_packages;

-- Insert the exact 5 coin packages from local database
INSERT INTO `coin_packages` (`id`, `name`, `coinAmount`, `priceUSD`, `bonusCoins`, `isActive`, `sortOrder`, `description`, `createdAt`, `updatedAt`) VALUES 
('550e8400-e29b-41d4-a716-446655440010','Starter Pack',100,0.99,0,1,1,'Perfect for trying out the store','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319'),
('550e8400-e29b-41d4-a716-446655440011','Small Pack',250,1.99,25,1,2,'Get some extra coins with bonus','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319'),
('550e8400-e29b-41d4-a716-446655440012','Medium Pack',600,4.99,100,1,3,'Popular choice with good bonus coins','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319'),
('550e8400-e29b-41d4-a716-446655440013','Large Pack',1300,9.99,300,1,4,'Great value with lots of bonus coins','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319'),
('550e8400-e29b-41d4-a716-446655440014','Mega Pack',2800,19.99,700,1,5,'Best value with maximum bonus coins','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319');

SELECT 'Coin packages updated! You should now have exactly 5 packages.' as status;
SELECT name, coinAmount, priceUSD, bonusCoins FROM coin_packages ORDER BY sortOrder;