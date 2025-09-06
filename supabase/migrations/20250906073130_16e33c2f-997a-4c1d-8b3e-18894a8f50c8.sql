-- Add quantity field to products table for inventory management
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock boolean DEFAULT true;

-- Create trigger to automatically update in_stock status based on quantity
CREATE OR REPLACE FUNCTION update_product_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.in_stock = (NEW.quantity > 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for products table
DROP TRIGGER IF EXISTS update_stock_status_trigger ON products;
CREATE TRIGGER update_stock_status_trigger
    BEFORE UPDATE OF quantity ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock_status();