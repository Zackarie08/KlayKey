-- MANUAL ONLY. Run once after earlier admin/promotions/input-length setup.
-- Select klaykey, back up first. No existing orders or addresses are deleted.
ALTER TABLE users MODIFY role ENUM('customer','admin','super_admin','delivery') NOT NULL DEFAULT 'customer';
CREATE TABLE saved_addresses (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL,
 label VARCHAR(50) NOT NULL,address JSON NOT NULL,is_default BOOLEAN NOT NULL DEFAULT FALSE,
 revision INT UNSIGNED NOT NULL DEFAULT 1,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id),INDEX(user_id)
);
INSERT INTO saved_addresses(user_id,label,address,is_default)
 SELECT id,'Home',address,TRUE FROM users WHERE address IS NOT NULL AND JSON_TYPE(address)='OBJECT';
CREATE TABLE order_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,order_id BIGINT UNSIGNED NOT NULL,
 actor_id BIGINT UNSIGNED NOT NULL,status VARCHAR(30) NOT NULL,kind VARCHAR(30) NOT NULL,
 message VARCHAR(500) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(order_id) REFERENCES orders(id),FOREIGN KEY(actor_id) REFERENCES users(id),INDEX(order_id,id)
);
CREATE TABLE order_notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL,
 order_id BIGINT UNSIGNED NULL,event_key VARCHAR(100) NULL,
 title VARCHAR(160) NOT NULL,message VARCHAR(500) NOT NULL,url VARCHAR(255) NULL,
 read_at DATETIME NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(order_id) REFERENCES orders(id),
 UNIQUE(user_id,event_key),INDEX(user_id,read_at,id)
);
CREATE TABLE delivery_assignments (
 order_id BIGINT UNSIGNED PRIMARY KEY,rider_id BIGINT UNSIGNED NOT NULL,
 assigned_by BIGINT UNSIGNED NOT NULL,status ENUM('assigned','out','failed','delivered') NOT NULL DEFAULT 'assigned',
 revision INT UNSIGNED NOT NULL DEFAULT 1,attempts INT UNSIGNED NOT NULL DEFAULT 0,
 failure_reason VARCHAR(500) NULL,recipient VARCHAR(50) NULL,proof_file VARCHAR(80) NULL,
 assigned_at DATETIME NOT NULL,started_at DATETIME NULL,delivered_at DATETIME NULL,
 FOREIGN KEY(order_id) REFERENCES orders(id),FOREIGN KEY(rider_id) REFERENCES users(id),
 FOREIGN KEY(assigned_by) REFERENCES users(id),INDEX(rider_id,status)
);

ALTER TABLE payments MODIFY status ENUM('simulated-paid','pending-cod','collected-cod') NOT NULL;
