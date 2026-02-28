ALTER TABLE products
  ADD COLUMN original_price numeric DEFAULT NULL,
  ADD COLUMN discount_price numeric DEFAULT NULL;