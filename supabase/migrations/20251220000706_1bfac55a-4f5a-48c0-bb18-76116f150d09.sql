-- Add RLS policies for the artists storage bucket

-- Allow anyone to view artist images (bucket is public)
CREATE POLICY "Anyone can view artist images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'artists');

-- Only admins can upload artist images
CREATE POLICY "Only admins can upload artist images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'artists' 
  AND public.is_admin(auth.uid())
);

-- Only admins can update artist images
CREATE POLICY "Only admins can update artist images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'artists' 
  AND public.is_admin(auth.uid())
);

-- Only admins can delete artist images
CREATE POLICY "Only admins can delete artist images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'artists' 
  AND public.is_admin(auth.uid())
);