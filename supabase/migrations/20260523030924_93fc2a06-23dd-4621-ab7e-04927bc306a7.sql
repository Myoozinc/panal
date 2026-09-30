DROP POLICY IF EXISTS "Owner can add participants" ON public.collaboration_participants;

CREATE POLICY "Owner can add participants"
ON public.collaboration_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collaborations c
    WHERE c.id = collaboration_participants.collab_id
      AND c.owner_id = auth.uid()
  )
  AND (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE (m.user_a = auth.uid() AND m.user_b = collaboration_participants.user_id)
         OR (m.user_b = auth.uid() AND m.user_a = collaboration_participants.user_id)
    )
  )
);