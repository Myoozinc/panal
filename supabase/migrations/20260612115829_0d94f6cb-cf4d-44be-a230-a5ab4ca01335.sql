
-- 1) Avatar ownership checks on UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete avatars" ON storage.objects;

CREATE POLICY "Owners update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners delete own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2) Prevent broad listing of the public avatars bucket.
-- Public URLs continue to work via the CDN; only storage list/select API is blocked.
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;

-- 3) Prevent forging sender_id in agreement messages
DROP POLICY IF EXISTS "Members can insert agreement messages" ON public.collab_agreement_messages;

CREATE POLICY "Members can insert agreement messages"
ON public.collab_agreement_messages FOR INSERT TO authenticated
WITH CHECK (
  (sender_id IS NULL OR sender_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.collab_agreements a
    WHERE a.id = collab_agreement_messages.agreement_id
      AND (auth.uid() = a.user_a OR auth.uid() = a.user_b)
  )
);
