-- Add isValid column to shows table
-- Run this manually if the TypeORM migration doesn't work

ALTER TABLE `shows` ADD COLUMN `isValid` TINYINT(1) NOT NULL DEFAULT 1;

-- Optional: Add an index on isValid for better query performance
CREATE INDEX `IDX_show_isValid` ON `shows` (`isValid`);

-- Verify the column was added
DESCRIBE `shows`;
