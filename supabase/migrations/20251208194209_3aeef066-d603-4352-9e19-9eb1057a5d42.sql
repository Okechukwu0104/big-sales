-- Create a security definer function to check if a reviewer is a verified purchaser
-- This keeps email comparison server-side and doesn't expose emails to the client
CREATE OR REPLACE FUNCTION public.is_verified_purchase(p_product_id uuid, p_reviewer_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM orders o
    WHERE LOWER(o.customer_email) = LOWER(p_reviewer_email)
      AND o.order_items::jsonb @> ('[{"id": "' || p_product_id::text || '"}]')::jsonb
  )
$$;

-- Create a view for public reviews that excludes email addresses
CREATE OR REPLACE VIEW public.reviews_public AS
SELECT 
  r.id,
  r.product_id,
  r.reviewer_name,
  r.rating,
  r.review_text,
  r.images,
  r.created_at,
  r.updated_at,
  r.user_id,
  public.is_verified_purchase(r.product_id, r.reviewer_email) AS is_verified_purchase
FROM public.reviews r;

-- Grant SELECT on the view to authenticated and anon roles
GRANT SELECT ON public.reviews_public TO authenticated, anon;