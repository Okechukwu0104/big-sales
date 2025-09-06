-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION update_product_stock_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.in_stock = (NEW.quantity > 0);
    RETURN NEW;
END;
$$;