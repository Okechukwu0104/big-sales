
ALTER TABLE products ADD COLUMN video_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-videos', 'product-videos', true);

CREATE POLICY "Public video access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-videos');

CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-videos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-videos' AND
  has_role(auth.uid(), 'admin'::app_role)
);
