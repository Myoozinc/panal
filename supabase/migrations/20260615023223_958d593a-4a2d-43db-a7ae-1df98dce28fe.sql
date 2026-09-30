DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
CREATE POLICY "Owners upload own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);