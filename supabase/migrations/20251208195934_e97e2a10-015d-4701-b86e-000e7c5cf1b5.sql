-- Drop the overly permissive policy that exposes customer PII
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;

-- Create admin-only SELECT policy
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));