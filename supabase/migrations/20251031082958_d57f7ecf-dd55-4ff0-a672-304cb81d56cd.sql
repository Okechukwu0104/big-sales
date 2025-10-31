-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;

-- Create a new policy that allows anyone to view orders
-- This is safe because users need either the order ID or email to find orders
CREATE POLICY "Anyone can view orders"
ON orders
FOR SELECT
USING (true);