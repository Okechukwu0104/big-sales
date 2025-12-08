-- Fix the security definer view warning by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.reviews_public;

CREATE VIEW public.reviews_public 
WITH (security_invoker = true)
AS
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