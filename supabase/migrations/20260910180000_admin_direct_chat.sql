-- 1. Helper function for admin to initiate a chat with any user
CREATE OR REPLACE FUNCTION public.start_admin_chat(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_match_id uuid;
  v_conv_id uuid;
  u_a uuid;
  u_b uuid;
BEGIN
  IF NOT public.has_role(v_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Solo administradores pueden iniciar chats directos';
  END IF;

  IF v_admin_id = target_user_id THEN
    RAISE EXCEPTION 'No puedes iniciar un chat contigo mismo';
  END IF;

  IF v_admin_id < target_user_id THEN
    u_a := v_admin_id; u_b := target_user_id;
  ELSE
    u_a := target_user_id; u_b := v_admin_id;
  END IF;

  -- Ensure match exists
  SELECT id INTO v_match_id FROM public.matches WHERE user_a = u_a AND user_b = u_b;
  IF v_match_id IS NULL THEN
    INSERT INTO public.matches (user_a, user_b)
    VALUES (u_a, u_b)
    ON CONFLICT (user_a, user_b) DO NOTHING
    RETURNING id INTO v_match_id;

    IF v_match_id IS NULL THEN
      SELECT id INTO v_match_id FROM public.matches WHERE user_a = u_a AND user_b = u_b;
    END IF;
  END IF;

  -- Ensure conversation exists
  SELECT id INTO v_conv_id FROM public.conversations WHERE (user_a = u_a AND user_b = u_b) OR match_id = v_match_id;
  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (match_id, user_a, user_b)
    VALUES (v_match_id, u_a, u_b)
    ON CONFLICT (match_id) DO NOTHING
    RETURNING id INTO v_conv_id;

    IF v_conv_id IS NULL THEN
      SELECT id INTO v_conv_id FROM public.conversations WHERE match_id = v_match_id;
    END IF;
  END IF;

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_admin_chat(uuid) TO authenticated;

-- 2. Allow admins to insert matches and conversations directly if needed
DROP POLICY IF EXISTS "Admins can insert matches" ON public.matches;
CREATE POLICY "Admins can insert matches" ON public.matches
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert conversations" ON public.conversations;
CREATE POLICY "Admins can insert conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
