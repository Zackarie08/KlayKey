-- MANUAL ONLY. Back up your database first. Run once against the existing store.
-- This file is deliberately outside migrations/ so application startup cannot apply it.
ALTER TABLE users MODIFY role ENUM('customer','admin','super_admin') NOT NULL DEFAULT 'customer';
ALTER TABLE products ADD low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5;
ALTER TABLE products ADD row_version INT UNSIGNED NOT NULL DEFAULT 1;
CREATE TABLE store_promotion (
 id TINYINT PRIMARY KEY, title VARCHAR(100) NOT NULL, message VARCHAR(500) NOT NULL,
 discount_type ENUM('percent','fixed') NOT NULL DEFAULT 'percent', discount_value INT UNSIGNED NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT FALSE, starts_at DATETIME NULL, ends_at DATETIME NULL,
 product_ids JSON NOT NULL, category_ids JSON NOT NULL, revision INT UNSIGNED NOT NULL DEFAULT 1,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO store_promotion(id,title,message,discount_type,discount_value,enabled,product_ids,category_ids)
VALUES(1,'Opening sale','Take 10% off eligible prebuilt keyboards. Discount applies automatically in your bag.','percent',10,TRUE,JSON_ARRAY(),JSON_ARRAY('prebuilt'));
CREATE TABLE admin_audit (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, actor_id BIGINT UNSIGNED NOT NULL,
 action VARCHAR(60) NOT NULL, entity_type VARCHAR(40) NOT NULL, entity_id VARCHAR(100) NOT NULL,
 details JSON NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(actor_id) REFERENCES users(id), INDEX(created_at)
);
CREATE TABLE stock_movements (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, product_id BIGINT UNSIGNED NOT NULL,
 actor_id BIGINT UNSIGNED NULL, delta INT NOT NULL, balance INT UNSIGNED NOT NULL,
 reason VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(product_id) REFERENCES products(id), FOREIGN KEY(actor_id) REFERENCES users(id), INDEX(product_id,created_at)
);
CREATE TABLE order_admin_notes (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, order_id BIGINT UNSIGNED NOT NULL,
 actor_id BIGINT UNSIGNED NOT NULL, note VARCHAR(2000) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(actor_id) REFERENCES users(id)
);
-- Existing account only; never creates an account or sets a password.
UPDATE users SET role='super_admin' WHERE email='seangabbyperalta@gmail.com' AND is_active=1;
-- Must return exactly one active super_admin. If absent, register normally first,
-- then run only the UPDATE above (do not rerun the ALTER/CREATE statements).
SELECT id,email,role,is_active FROM users WHERE email='seangabbyperalta@gmail.com';
