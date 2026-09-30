-- RPC: anyone authenticated can get the count of matches for a user
CREATE OR REPLACE FUNCTION public.get_user_match_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.matches
   WHERE user_a = _user_id OR user_b = _user_id
$$;

GRANT EXECUTE ON FUNCTION public.get_user_match_count(uuid) TO authenticated;

-- Admins can view all matches (for moderation panel)
CREATE POLICY "Admins view all matches"
ON public.matches
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
