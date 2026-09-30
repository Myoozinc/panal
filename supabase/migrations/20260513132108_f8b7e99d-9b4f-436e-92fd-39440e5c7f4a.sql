-- 1. Lock down legacy "artists" bucket: drop the open ALL policy
DROP POLICY IF EXISTS "Give public access to artists bucket" ON storage.objects;

-- 2. Allow self-leave from collaboration_participants
CREATE POLICY "Participants can leave a collaboration"
ON public.collaboration_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Revoke EXECUTE on SECURITY DEFINER trigger-only functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_match_on_mutual_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;