-- Create the releases storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('releases', 'releases', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the releases bucket
CREATE POLICY "Anyone can view release images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'releases');

CREATE POLICY "Admins can upload release images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'releases' 
  AND auth.uid() IN (
    SELECT id FROM promoter_profiles WHERE is_admin = true
  )
);

CREATE POLICY "Admins can update release images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'releases' 
  AND auth.uid() IN (
    SELECT id FROM promoter_profiles WHERE is_admin = true
  )
);

CREATE POLICY "Admins can delete release images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'releases' 
  AND auth.uid() IN (
    SELECT id FROM promoter_profiles WHERE is_admin = true
  )
);