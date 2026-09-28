-- Catatan UMUM keranjang per pelanggan, terpisah dari catatan item/order.
-- Aman dijalankan ulang; tidak mengubah cart_items, orders atau data lama.
CREATE TABLE IF NOT EXISTS cart_notes (
 user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
 note VARCHAR(500) NOT NULL DEFAULT '',
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
