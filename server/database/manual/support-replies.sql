-- MANUAL ONLY. Run after orders-delivery-notifications.sql. Run once.
ALTER TABLE contact_messages
 ADD COLUMN user_id BIGINT UNSIGNED NULL,
 ADD INDEX contact_user (user_id,id),
 ADD CONSTRAINT contact_user_fk FOREIGN KEY (user_id) REFERENCES users(id);
CREATE TABLE support_replies (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 message_id BIGINT UNSIGNED NOT NULL,actor_id BIGINT UNSIGNED NOT NULL,
 message TEXT NOT NULL,request_key VARCHAR(80) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(message_id) REFERENCES contact_messages(id),
 FOREIGN KEY(actor_id) REFERENCES users(id),
 UNIQUE(message_id,request_key),INDEX(message_id,id)
);
-- Existing inquiries stay unlinked: guest email alone does not prove account ownership.
