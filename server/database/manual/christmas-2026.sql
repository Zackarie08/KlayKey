-- MANUAL ONLY: select the klaykey database; back it up first.
-- Requires the existing admin-and-promotions.sql setup. Run this file ONCE.
-- DDL commits automatically in MySQL. Do not rerun ALTER statements.
ALTER TABLE store_promotion
 ADD kind VARCHAR(30) NOT NULL DEFAULT 'first_purchase',
 ADD include_builds BOOLEAN NOT NULL DEFAULT FALSE,
 ADD preview_at DATETIME NULL,
 ADD featured_product_id BIGINT UNSIGNED NULL;

START TRANSACTION;
UPDATE store_promotion SET title='A welcome gift for your first order',
 message='Enjoy 10% off eligible products on your first purchase. Your discount is applied automatically when you sign in.',
 discount_type='percent',discount_value=10,kind='first_purchase',revision=revision+1 WHERE id=1;

-- Never reset stock when the product already exists.
INSERT INTO products(slug,sku,name,category_id,description,short_description,price_cents,stock_quantity,layout,switch_type,connection_type,material,rgb_supported,is_featured,is_active,images,compatibility)
SELECT 'noel-75-limited-edition','KLAY-NOEL75-2026','Noël 75 · Christmas Edition','prebuilt',
 'A festive 75% keyboard with a pine-green case, warm ivory alphas, cranberry modifiers and evergreen accents. Gold details and snowflake legends bring the holidays to your desk. Linear switches, tri-mode connectivity and a matching USB cable. Available only during the December release, while stocks last.',
 'Pine green. Cranberry red. A little holiday magic. Limited to 50 keyboards.',
 499000,50,'75','linear','tri-mode','Aluminum',TRUE,TRUE,TRUE,
 JSON_ARRAY('/assets/images/noel-75.svg'),
 JSON_OBJECT('layouts',JSON_ARRAY('75'),'mount','MX','connections',JSON_ARRAY('wired','wireless','tri-mode'),'family','klay-modular')
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='noel-75-limited-edition');

-- Dates stored in UTC. Sale: Dec 1 00:00 through Dec 31 23:59:59 Philippine time.
INSERT INTO store_promotion(id,title,message,discount_type,discount_value,enabled,starts_at,ends_at,product_ids,category_ids,kind,include_builds,preview_at,featured_product_id)
SELECT 2,'Make room for Christmas.','Save 15% on selected keyboards and your custom build. Discover the limited Noël 75, made for a season of giving.',
 'percent',15,TRUE,'2026-11-30 16:00:00','2026-12-31 16:00:00',JSON_ARRAY(p.id),JSON_ARRAY(),'seasonal',TRUE,'2026-11-22 16:00:00',p.id
FROM products p WHERE p.slug='noel-75-limited-edition' AND NOT EXISTS(SELECT 1 FROM store_promotion WHERE id=2);
COMMIT;

SELECT id,title,discount_value,enabled,starts_at,ends_at,featured_product_id FROM store_promotion;
SELECT id,slug,price_cents,stock_quantity FROM products WHERE slug='noel-75-limited-edition';
