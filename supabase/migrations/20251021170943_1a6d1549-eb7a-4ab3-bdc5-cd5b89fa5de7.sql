-- Add category column to products table
ALTER TABLE products ADD COLUMN category text DEFAULT 'Uncategorized';

-- Add index for better query performance
CREATE INDEX idx_products_category ON products(category);