-- Enum for post types
CREATE TYPE public.channel_post_type AS ENUM ('promo', 'product', 'engagement');

-- Posts table
CREATE TABLE public.channel_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_type public.channel_post_type NOT NULL,
  caption TEXT NOT NULL,
  image_url TEXT,
  product_id UUID,
  product_link TEXT,
  generated_for_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_channel_posts_date ON public.channel_posts(generated_for_date DESC);
CREATE INDEX idx_channel_posts_product ON public.channel_posts(product_id) WHERE product_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_posts TO authenticated;
GRANT ALL ON public.channel_posts TO service_role;

ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage channel posts"
ON public.channel_posts FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Settings table (single row)
CREATE TABLE public.channel_ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  recipient_email TEXT NOT NULL DEFAULT 'joyadaeze845@gmail.com',
  channel_url TEXT NOT NULL DEFAULT 'https://whatsapp.com/channel/0029VbCiW8yKAwEjEeodvb0X',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_ai_settings TO authenticated;
GRANT ALL ON public.channel_ai_settings TO service_role;

ALTER TABLE public.channel_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage channel ai settings"
ON public.channel_ai_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_channel_ai_settings_updated_at
BEFORE UPDATE ON public.channel_ai_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings row
INSERT INTO public.channel_ai_settings (enabled, recipient_email, channel_url)
VALUES (true, 'joyadaeze845@gmail.com', 'https://whatsapp.com/channel/0029VbCiW8yKAwEjEeodvb0X');