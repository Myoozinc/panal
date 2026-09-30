DROP POLICY IF EXISTS "Owners upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners delete own avatars" ON storage.objects;

CREATE POLICY "Owners upload own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name ~ ('^' || auth.uid()::text || '[-_/].+')
  )
);

CREATE POLICY "Owners update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name ~ ('^' || auth.uid()::text || '[-_/].+')
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name ~ ('^' || auth.uid()::text || '[-_/].+')
  )
);

CREATE POLICY "Owners delete own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name ~ ('^' || auth.uid()::text || '[-_/].+')
  )
);