
CREATE POLICY "Admins view all conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all messages"
ON public.messages FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
