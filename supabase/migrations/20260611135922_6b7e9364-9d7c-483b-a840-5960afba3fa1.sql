DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images publicly accessible" ON storage.objects;

CREATE POLICY "Avatars public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated update avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated delete avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');