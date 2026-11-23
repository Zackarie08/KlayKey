-- MANUAL ONLY: run after multi-promotions.sql in your selected store database.
-- Preserves existing theme values and promotions. Safe to repeat.
ALTER TABLE store_promotion
 MODIFY COLUMN theme ENUM('standard','christmas','summer','halloween','new-year','valentines') NOT NULL DEFAULT 'standard';
