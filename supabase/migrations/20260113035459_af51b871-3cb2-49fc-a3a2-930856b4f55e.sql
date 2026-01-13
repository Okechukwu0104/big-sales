-- Phase 1: Database Schema Enhancements for BIG SALES Redesign

-- 1.1 Add hierarchical support to categories (parent_id for subcategories)
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create index for faster hierarchical queries
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- 1.2 Add brand and SKU to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS sku TEXT;

-- 1.3 Create Bundles Table
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  original_price NUMERIC NOT NULL DEFAULT 0,
  bundle_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on bundles
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

-- RLS policies for bundles
CREATE POLICY "Anyone can view active bundles" ON bundles
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage bundles" ON bundles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 1.4 Create Bundle Products Junction Table
CREATE TABLE IF NOT EXISTS bundle_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES bundles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bundle_id, product_id)
);

-- Enable RLS on bundle_products
ALTER TABLE bundle_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for bundle_products
CREATE POLICY "Anyone can view bundle products" ON bundle_products
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage bundle products" ON bundle_products
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 1.5 Create Product Tags Table
CREATE TABLE IF NOT EXISTS product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on product_tags
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_tags
CREATE POLICY "Anyone can view tags" ON product_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags" ON product_tags
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 1.6 Create Product Tag Assignments Junction Table
CREATE TABLE IF NOT EXISTS product_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES product_tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, tag_id)
);

-- Enable RLS on product_tag_assignments
ALTER TABLE product_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_tag_assignments
CREATE POLICY "Anyone can view tag assignments" ON product_tag_assignments
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tag assignments" ON product_tag_assignments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 1.7 Create Wishlists Table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on wishlists
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- RLS policies for wishlists
CREATE POLICY "Users can view own wishlist" ON wishlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own wishlist" ON wishlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own wishlist" ON wishlists
  FOR DELETE USING (auth.uid() = user_id);

-- 1.8 Create Recently Viewed Table
CREATE TABLE IF NOT EXISTS recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on recently_viewed
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

-- RLS policies for recently_viewed
CREATE POLICY "Users can view own recently viewed" ON recently_viewed
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to recently viewed" ON recently_viewed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update recently viewed" ON recently_viewed
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete recently viewed" ON recently_viewed
  FOR DELETE USING (auth.uid() = user_id);

-- 1.9 Insert default product tags
INSERT INTO product_tags (name, color) VALUES 
  ('New', '#22c55e'),
  ('Trending', '#f59e0b'),
  ('Sale', '#ef4444'),
  ('Best Seller', '#8b5cf6'),
  ('Limited', '#ec4899')
ON CONFLICT (name) DO NOTHING;

-- 1.10 Create trigger for bundles updated_at
CREATE OR REPLACE TRIGGER update_bundles_updated_at
  BEFORE UPDATE ON bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();