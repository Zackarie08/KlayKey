-- MANUAL ONLY. Run in the existing klaykey database after christmas-2026.sql.
-- This adds two products, updates the original illustration, and adds sale eligibility.
-- No ALTER statements; safe to rerun. Existing prices, stock and custom photos are preserved.
START TRANSACTION;

INSERT INTO products(slug,sku,name,category_id,description,short_description,price_cents,stock_quantity,layout,switch_type,connection_type,material,rgb_supported,is_featured,is_active,images,compatibility)
SELECT 'candy-cane-60-limited-edition','KLAY-CANDY60-2026','Candy Cane 60 · Christmas Edition','prebuilt','A compact Christmas edition with a cranberry-red case, warm white keys, candy-red modifiers and evergreen accents. Linear switches, tri-mode connectivity and USB cable. Available only during the December campaign, while stocks last.',
'Candy-red case. Cream keys. A compact Christmas classic.',399000,50,'60','linear','tri-mode','Aluminum',TRUE,TRUE,TRUE,
JSON_ARRAY('/assets/images/candy-60.webp'),JSON_OBJECT('layouts',JSON_ARRAY('60'),'mount','MX','connections',JSON_ARRAY('wired','wireless','tri-mode'),'family','klay-modular')
FROM store_promotion WHERE id=2 AND kind='seasonal' AND NOT EXISTS(SELECT 1 FROM products WHERE slug='candy-cane-60-limited-edition' OR sku='KLAY-CANDY60-2026');
UPDATE store_promotion s JOIN products p ON p.sku='KLAY-CANDY60-2026'
SET s.product_ids=IF(JSON_CONTAINS(s.product_ids,JSON_ARRAY(p.id)),s.product_ids,JSON_ARRAY_APPEND(s.product_ids,'$',p.id)) WHERE s.id=2;

INSERT INTO products(slug,sku,name,category_id,description,short_description,price_cents,stock_quantity,layout,switch_type,connection_type,material,rgb_supported,is_featured,is_active,images,compatibility)
SELECT 'winter-frost-100-limited-edition','KLAY-FROST100-2026','Winter Frost 100 · Christmas Edition','prebuilt','A full-size winter edition with an arctic-blue case, snow-white keys, ice-blue modifiers and lavender accents. Silver hardware, cool winter lighting, linear switches and tri-mode connectivity with USB cable. Available only during the December campaign, while stocks last.',
'Arctic blue. Snow-white keys. A full-size winter workspace.',649000,50,'100','linear','tri-mode','Aluminum',TRUE,TRUE,TRUE,
JSON_ARRAY('/assets/images/frost-100.webp'),JSON_OBJECT('layouts',JSON_ARRAY('100'),'mount','MX','connections',JSON_ARRAY('wired','wireless','tri-mode'),'family','klay-modular')
FROM store_promotion WHERE id=2 AND kind='seasonal' AND NOT EXISTS(SELECT 1 FROM products WHERE slug='winter-frost-100-limited-edition' OR sku='KLAY-FROST100-2026');
UPDATE store_promotion s JOIN products p ON p.sku='KLAY-FROST100-2026'
SET s.product_ids=IF(JSON_CONTAINS(s.product_ids,JSON_ARRAY(p.id)),s.product_ids,JSON_ARRAY_APPEND(s.product_ids,'$',p.id)) WHERE s.id=2;

UPDATE products SET images=JSON_ARRAY('/assets/images/noel-75.webp'),row_version=row_version+1
WHERE sku='KLAY-NOEL75-2026' AND JSON_LENGTH(images)=1 AND JSON_UNQUOTE(JSON_EXTRACT(images,'$[0]'))='/assets/images/noel-75.svg';
UPDATE store_promotion SET message=IF(message='Save 15% on selected keyboards and your custom build. Discover the limited Noël 75, made for a season of giving.','Three sizes. Three holiday designs. Save on selected keyboards and your custom build this December.',message),revision=revision+1 WHERE id=2;
COMMIT;
SELECT id,name,sku,price_cents,stock_quantity,layout FROM products WHERE sku IN ('KLAY-CANDY60-2026','KLAY-NOEL75-2026','KLAY-FROST100-2026') ORDER BY FIELD(layout,'60','75','100');
-- Expect three rows. If missing, confirm the earlier christmas-2026.sql setup was completed.
