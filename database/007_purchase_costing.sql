-- Renjana Snacks V27 - Purchase Discount & HPP Costing
-- Run once after 006_accounting.sql. The one-click patch uses the idempotent Node migration instead.

ALTER TABLE purchases
  ADD COLUMN gross_total DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER due_date,
  ADD COLUMN item_discount_total DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER gross_total,
  ADD COLUMN invoice_discount_type ENUM('NONE','AMOUNT','PERCENT') NOT NULL DEFAULT 'NONE' AFTER item_discount_total,
  ADD COLUMN invoice_discount_value DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER invoice_discount_type,
  ADD COLUMN invoice_discount_total DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER invoice_discount_value,
  ADD COLUMN landed_cost_total DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER invoice_discount_total;

ALTER TABLE purchase_items
  ADD COLUMN unit_price DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER quantity,
  ADD COLUMN discount_type ENUM('NONE','AMOUNT','PERCENT') NOT NULL DEFAULT 'NONE' AFTER unit_price,
  ADD COLUMN discount_value DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER discount_type,
  ADD COLUMN gross_amount DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER discount_value,
  ADD COLUMN discount_amount DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER gross_amount,
  ADD COLUMN invoice_discount_alloc DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER discount_amount,
  ADD COLUMN landed_cost_alloc DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER invoice_discount_alloc;

UPDATE purchases SET gross_total=total WHERE gross_total=0 AND total>0;
UPDATE purchase_items SET unit_price=unit_cost WHERE unit_price=0 AND unit_cost>0;
UPDATE purchase_items SET gross_amount=amount WHERE gross_amount=0 AND amount>0;
