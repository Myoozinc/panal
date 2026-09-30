-- ====================================================================
-- MIGRATION: Admin Email Visibility, Official App Chat & Mass Broadcast
-- ====================================================================

-- 1. Ensure Official Support System User exists in auth.users & public.profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'::uuid) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid,
      'authenticated',
      'authenticated',
      'soporte@panal.app',
      '',
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Equipo Panal","username":"panal"}'::jsonb,
      false
    );
  END IF;
END $$;

-- Ensure official support profile
INSERT INTO public.profiles (
  id,
  display_name,
  username,
  avatar_url,
  bio,
  discipline,
  is_verified,
  onboarding_completed
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Equipo Panal',
  'panal',
  '/logo.png',
  'Cuenta oficial del equipo de Panal. Canal exclusivo de soporte, orientación y avisos oficiales.',
  'other',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = 'Equipo Panal',
  username = 'panal',
  avatar_url = '/logo.png',
  bio = 'Cuenta oficial del equipo de Panal. Canal exclusivo de soporte, orientación y avisos oficiales.',
  is_verified = true,
  onboarding_completed = true;

-- Ensure admin role for system user
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;


-- ====================================================================
-- 2. Admin Users Query: returns user profiles + email from auth.users
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  username text,
  avatar_url text,
  discipline text,
  is_verified boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(u.email::text, 'Sin correo'),
    COALESCE(p.display_name, 'Sin nombre'),
    p.username,
    p.avatar_url,
    p.discipline::text,
    p.is_verified,
    p.created_at,
    u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id <> '00000000-0000-0000-0000-000000000001'::uuid
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;


-- ====================================================================
-- 3. Get single user email for admin
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_admin_user_email(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores';
  END IF;

  SELECT u.email::text INTO v_email FROM auth.users u WHERE u.id = p_user_id;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_user_email(uuid) TO authenticated;


-- ====================================================================
-- 4. Get all user emails for mass broadcast / CSV export
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_all_user_emails()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  username text,
  discipline text,
  is_verified boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(u.email::text, ''),
    COALESCE(p.display_name, ''),
    COALESCE(p.username, ''),
    COALESCE(p.discipline::text, ''),
    p.is_verified,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id <> '00000000-0000-0000-0000-000000000001'::uuid
    AND u.email IS NOT NULL
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_user_emails() TO authenticated;


-- ====================================================================
-- 5. Start or get Official Support Chat (Decoupled from Admin user)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.start_official_support_chat(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_match_id uuid;
  v_conv_id uuid;
  u_a uuid;
  u_b uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores';
  END IF;

  IF target_user_id = v_system_id THEN
    RAISE EXCEPTION 'Usuario inválido';
  END IF;

  IF v_system_id < target_user_id THEN
    u_a := v_system_id; u_b := target_user_id;
  ELSE
    u_a := target_user_id; u_b := v_system_id;
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

GRANT EXECUTE ON FUNCTION public.start_official_support_chat(uuid) TO authenticated;


-- ====================================================================
-- 6. Send message on behalf of Official Support ("Equipo Panal")
-- ====================================================================
CREATE OR REPLACE FUNCTION public.send_official_support_message(target_user_id uuid, p_content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_conv_id uuid;
  v_msg_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores';
  END IF;

  IF trim(p_content) = '' THEN
    RAISE EXCEPTION 'El mensaje no puede estar vacío';
  END IF;

  -- Get or create official conversation
  v_conv_id := public.start_official_support_chat(target_user_id);

  -- Insert message as system user
  INSERT INTO public.messages (conversation_id, sender_id, content)
  VALUES (v_conv_id, v_system_id, trim(p_content))
  RETURNING id INTO v_msg_id;

  -- Update conversation last_message_at
  UPDATE public.conversations
  SET last_message_at = now()
  WHERE id = v_conv_id;

  -- Notify the target user
  INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
  VALUES (target_user_id, v_system_id, 'message', v_conv_id);

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_official_support_message(uuid, text) TO authenticated;


-- ====================================================================
-- ====================================================================
-- 7. Broadcast in-app notification & chat message to all registered users
-- ====================================================================
CREATE OR REPLACE FUNCTION public.broadcast_official_app_update(p_title text, p_message text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_content text;
  v_count integer := 0;
  r RECORD;
  v_conv_id uuid;
  v_match_id uuid;
  u_a uuid;
  u_b uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores';
  END IF;

  v_content := trim(p_title) || E'\n\n' || trim(p_message);

  FOR r IN SELECT id FROM public.profiles WHERE id <> v_system_id LOOP
    IF v_system_id < r.id THEN
      u_a := v_system_id; u_b := r.id;
    ELSE
      u_a := r.id; u_b := v_system_id;
    END IF;

    -- Ensure match
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

    -- Ensure conversation
    SELECT id INTO v_conv_id FROM public.conversations WHERE (user_a = u_a AND user_b = u_b) OR match_id = v_match_id;
    IF v_conv_id IS NULL THEN
      INSERT INTO public.conversations (match_id, user_a, user_b, last_message_at)
      VALUES (v_match_id, u_a, u_b, now())
      ON CONFLICT (match_id) DO NOTHING
      RETURNING id INTO v_conv_id;

      IF v_conv_id IS NULL THEN
        SELECT id INTO v_conv_id FROM public.conversations WHERE match_id = v_match_id;
      END IF;
    ELSE
      UPDATE public.conversations SET last_message_at = now() WHERE id = v_conv_id;
    END IF;

    -- Insert real chat message in this user's Panal chat
    IF v_conv_id IS NOT NULL THEN
      INSERT INTO public.messages (conversation_id, sender_id, content)
      VALUES (v_conv_id, v_system_id, v_content);

      -- Insert notification pointing directly to this conversation
      INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
      VALUES (r.id, v_system_id, 'message', v_conv_id);

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.broadcast_official_app_update(text, text) TO authenticated;

-- Compatibility wrapper
CREATE OR REPLACE FUNCTION public.broadcast_app_notification(p_title text, p_message text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.broadcast_official_app_update(p_title, p_message);
END;
$$;

GRANT EXECUTE ON FUNCTION public.broadcast_app_notification(text, text) TO authenticated;


-- ====================================================================
-- 8. Allow admins to insert/update messages as system support in RLS
-- ====================================================================
DROP POLICY IF EXISTS "Admins send official messages" ON public.messages;
CREATE POLICY "Admins send official messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = '00000000-0000-0000-0000-000000000001'::uuid
  );
