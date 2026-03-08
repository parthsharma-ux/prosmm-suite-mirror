-- Create storage bucket for payment assets (QR codes etc)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-assets', 'payment-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload files
CREATE POLICY "Admins can upload payment assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-assets'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update/overwrite files
CREATE POLICY "Admins can update payment assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-assets'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow anyone to read payment assets (QR codes need to be visible)
CREATE POLICY "Anyone can view payment assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-assets');