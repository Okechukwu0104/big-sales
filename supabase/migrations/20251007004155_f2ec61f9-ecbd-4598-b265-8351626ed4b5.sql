-- Update RLS policies to allow anyone to like products (not just authenticated users)
DROP POLICY IF EXISTS "Authenticated users can like products" ON public.product_likes;

CREATE POLICY "Anyone can like products"
ON public.product_likes
FOR INSERT
WITH CHECK (true);

-- Allow anyone to unlike products they've liked
DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.product_likes;

CREATE POLICY "Anyone can unlike products"
ON public.product_likes
FOR DELETE
USING (true);