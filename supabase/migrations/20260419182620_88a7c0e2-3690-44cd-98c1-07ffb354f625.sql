
-- 1. Restrict reviews SELECT to hide reviewer_email from public; use existing reviews_public view instead
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

CREATE POLICY "Admins can view full reviews"
ON public.reviews FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Lock down product-images storage to admins for write/delete
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can delete product images" ON storage.objects;

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict review-images deletion to admins (was open to anyone)
DROP POLICY IF EXISTS "Anyone can delete their own review images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete review images" ON storage.objects;

CREATE POLICY "Admins can delete review images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'review-images' AND has_role(auth.uid(), 'admin'::app_role));

-- 4. Tighten product_likes DELETE: must match user_id (no more arbitrary deletes)
DROP POLICY IF EXISTS "Anyone can unlike products" ON public.product_likes;

CREATE POLICY "Users can unlike own likes"
ON public.product_likes FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (auth.uid() IS NULL AND user_id = product_likes.user_id)
);

-- For guest support, allow delete by exact user_id match (guest UUID stored in localStorage)
DROP POLICY IF EXISTS "Users can unlike own likes" ON public.product_likes;
CREATE POLICY "Users can unlike own likes"
ON public.product_likes FOR DELETE
USING (
  -- authenticated users: must own the like
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- 5. Add length constraints on user-input columns as defense in depth
ALTER TABLE public.reviews
  ADD CONSTRAINT reviewer_name_length CHECK (length(reviewer_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT review_text_length CHECK (review_text IS NULL OR length(review_text) <= 2000),
  ADD CONSTRAINT reviewer_email_length CHECK (reviewer_email IS NULL OR length(reviewer_email) <= 255);

ALTER TABLE public.orders
  ADD CONSTRAINT customer_name_length CHECK (length(customer_name) BETWEEN 1 AND 200),
  ADD CONSTRAINT customer_email_length CHECK (length(customer_email) BETWEEN 3 AND 255),
  ADD CONSTRAINT customer_phone_length CHECK (length(customer_phone) BETWEEN 5 AND 50),
  ADD CONSTRAINT shipping_address_length CHECK (length(shipping_address) BETWEEN 5 AND 500);
