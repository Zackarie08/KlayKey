-- MANUAL ONLY. Requires existing admin and Christmas setup. Run ALTER once.
-- Select klaykey and back up first. Does not reset products, stock or orders.
ALTER TABLE store_promotion
 MODIFY id INT UNSIGNED NOT NULL AUTO_INCREMENT,
 ADD display_type ENUM('popup','floating') NOT NULL DEFAULT 'floating',
 ADD audience ENUM('everyone','first_purchase') NOT NULL DEFAULT 'everyone',
 ADD theme ENUM('standard','christmas') NOT NULL DEFAULT 'standard',
 ADD priority INT UNSIGNED NOT NULL DEFAULT 0;
UPDATE store_promotion SET display_type='floating',audience='first_purchase',theme='standard' WHERE id=1;
UPDATE store_promotion SET display_type='popup',audience='everyone',theme='christmas',priority=10 WHERE id=2;
-- Normalize known existing catalog values. Unknown values are left for admin review.
UPDATE products SET connection_type=CASE
 WHEN LOWER(TRIM(connection_type)) IN ('bluetooth','bluetooth 5.0','bt') THEN 'bluetooth'
 WHEN LOWER(TRIM(connection_type)) IN ('wired','usb','usb-c','wired (usb-c)') THEN 'wired'
 WHEN LOWER(TRIM(connection_type)) IN ('wireless','2.4ghz','2.4ghz wireless','2.4g') THEN 'wireless'
 WHEN LOWER(TRIM(connection_type)) IN ('tri-mode','tri mode','trimode','tri-mode (wired + bluetooth + 2.4ghz)') THEN 'tri-mode'
 ELSE connection_type END;
UPDATE products SET layout=REPLACE(REPLACE(LOWER(TRIM(layout)),'ansi ',''),'%','') WHERE LOWER(TRIM(layout)) IN ('60%','75%','100%','ansi 60%','ansi 75%','ansi 100%');
UPDATE products SET switch_type=LOWER(TRIM(switch_type)) WHERE LOWER(TRIM(switch_type)) IN ('linear','tactile','clicky');
UPDATE products SET switch_type=option_value WHERE option_field='switch' AND option_value IN ('switch-red','switch-brown','switch-blue','switch-black','switch-yellow','switch-silent','switch-speed','switch-clear','switch-jade','switch-cream');
UPDATE products SET switch_type='switch-red' WHERE LOWER(TRIM(switch_type))='red linear';
UPDATE products SET switch_type='switch-brown' WHERE LOWER(TRIM(switch_type))='brown tactile';
UPDATE products SET switch_type='switch-blue' WHERE LOWER(TRIM(switch_type))='blue clicky';
UPDATE products SET switch_type='switch-black' WHERE LOWER(TRIM(switch_type))='black linear';
UPDATE products SET switch_type='switch-yellow' WHERE LOWER(TRIM(switch_type))='yellow linear';
UPDATE products SET switch_type='switch-silent' WHERE LOWER(TRIM(switch_type))='silent red';
UPDATE products SET switch_type='switch-speed' WHERE LOWER(TRIM(switch_type))='speed silver';
UPDATE products SET switch_type='switch-clear' WHERE LOWER(TRIM(switch_type))='clear tactile';
UPDATE products SET switch_type='switch-jade' WHERE LOWER(TRIM(switch_type))='jade clicky';
UPDATE products SET switch_type='switch-cream' WHERE LOWER(TRIM(switch_type))='cream linear';
SELECT id,title,display_type,audience,enabled FROM store_promotion;
SELECT id,name,switch_type,connection_type,layout FROM products
 WHERE (switch_type IS NOT NULL AND switch_type<>'' AND switch_type NOT IN ('linear','tactile','clicky','switch-red','switch-brown','switch-blue','switch-black','switch-yellow','switch-silent','switch-speed','switch-clear','switch-jade','switch-cream'))
 OR (connection_type IS NOT NULL AND connection_type<>'' AND connection_type NOT IN ('wired','bluetooth','wireless','tri-mode'));
-- Review any rows in the last result using the product editor's dropdowns.
