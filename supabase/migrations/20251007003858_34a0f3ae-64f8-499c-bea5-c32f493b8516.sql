-- Add likes_count column to products table
ALTER TABLE public.products
ADD COLUMN likes_count integer NOT NULL DEFAULT 0;

-- Create product_likes table to track user likes
CREATE TABLE public.product_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on product_likes
ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_likes
CREATE POLICY "Anyone can view product likes"
ON public.product_likes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like products"
ON public.product_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
ON public.product_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to update product likes count
CREATE OR REPLACE FUNCTION public.update_product_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products
    SET likes_count = likes_count + 1
    WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products
    SET likes_count = likes_count - 1
    WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to automatically update likes count
CREATE TRIGGER update_product_likes_count_trigger
AFTER INSERT OR DELETE ON public.product_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_product_likes_count();