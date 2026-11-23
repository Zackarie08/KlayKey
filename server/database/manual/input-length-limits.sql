-- MANUAL ONLY. Select the existing klaykey database and back up first.
-- Expands storage only. Existing long names/descriptions are not truncated.
ALTER TABLE products
 MODIFY sku VARCHAR(50) NOT NULL,
 MODIFY short_description VARCHAR(500) NOT NULL;
ALTER TABLE users MODIFY phone VARCHAR(50) NOT NULL DEFAULT '';

-- Expand the editable category ID and its referencing column together.
-- Resolve the existing constraint name rather than assuming a generated name.
SET @category_fk = (
 SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products'
 AND COLUMN_NAME='category_id' AND REFERENCED_TABLE_NAME='product_categories'
 LIMIT 1
);
SET @drop_category_fk = IF(@category_fk IS NULL,'SELECT 1',
 CONCAT('ALTER TABLE products DROP FOREIGN KEY `',REPLACE(@category_fk,'`','``'),'`'));
PREPARE category_statement FROM @drop_category_fk;
EXECUTE category_statement;
DEALLOCATE PREPARE category_statement;
ALTER TABLE product_categories MODIFY id VARCHAR(50) NOT NULL;
ALTER TABLE products MODIFY category_id VARCHAR(50) NOT NULL;
ALTER TABLE products ADD CONSTRAINT fk_products_category
 FOREIGN KEY(category_id) REFERENCES product_categories(id);

-- Keep existing wider name/title/description columns; application validation
-- applies the new 50/500 limits on new or edited data, without data loss.
SELECT TABLE_NAME,COLUMN_NAME,CHARACTER_MAXIMUM_LENGTH
FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
AND ((TABLE_NAME='products' AND COLUMN_NAME IN ('sku','short_description','category_id'))
 OR (TABLE_NAME='users' AND COLUMN_NAME='phone')
 OR (TABLE_NAME='product_categories' AND COLUMN_NAME='id'));
