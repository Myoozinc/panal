-- ====================================================================
-- 1. Ampliación de disciplinas del entretenimiento
-- ====================================================================
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'booking_agent';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'marketing_agency';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'influencer';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'brand_sponsor';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'record_label';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'actor';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'voice_actor';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'stylist';

-- ====================================================================
-- 2. Soporte para Conversaciones Grupales y Multi-Matches
-- ====================================================================
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS collab_id uuid REFERENCES public.collaborations(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members see conversation_members" ON public.conversation_members;
CREATE POLICY "Members see conversation_members" ON public.conversation_members
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert conversation_members" ON public.conversation_members;
CREATE POLICY "Members can insert conversation_members" ON public.conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Members can delete conversation_members" ON public.conversation_members;
CREATE POLICY "Members can delete conversation_members" ON public.conversation_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Update is_conversation_member to support group members
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations WHERE id = _conv_id AND (user_a = _user_id OR user_b = _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.conversation_members WHERE conversation_id = _conv_id AND user_id = _user_id
  );
$$;

-- Update conversations SELECT policy to allow conversation_members
DROP POLICY IF EXISTS "Members see conversation" ON public.conversations;
CREATE POLICY "Members see conversation" ON public.conversations FOR SELECT TO authenticated
  USING (
    auth.uid() = user_a OR auth.uid() = user_b OR EXISTS (
      SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = id AND cm.user_id = auth.uid()
    )
  );

-- Update conversations INSERT policy to allow creating group conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b OR is_group = true);

-- Allow authenticated users to join collaboration participants when matching
DROP POLICY IF EXISTS "Users can join collabs" ON public.collaboration_participants;
CREATE POLICY "Users can join collabs" ON public.collaboration_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.collaborations c WHERE c.id = collab_id AND c.owner_id = auth.uid()
  ));

-- ====================================================================
-- 3. Swipes adaptados a Squads y Proyectos
-- ====================================================================
ALTER TABLE public.swipes
  ADD COLUMN IF NOT EXISTS target_collab_id uuid REFERENCES public.collaborations(id) ON DELETE CASCADE;

ALTER TABLE public.swipes ALTER COLUMN swiped_id DROP NOT NULL;

-- Remove rigid uniqueness if it was table-wide constraint and replace with partial indexes
ALTER TABLE public.swipes DROP CONSTRAINT IF EXISTS swipes_swiper_id_swiped_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_swipes_user_user ON public.swipes(swiper_id, swiped_id) WHERE target_collab_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_swipes_user_collab ON public.swipes(swiper_id, target_collab_id) WHERE target_collab_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_swipes_target_collab ON public.swipes(target_collab_id);

-- Safe notify_on_like trigger
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.direction = 'like' AND NEW.swiped_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
    VALUES (NEW.swiped_id, NEW.swiper_id, 'like', NEW.id);
  END IF;
  RETURN NEW;
END $$;

-- Safe on_new_message trigger with support for group notifications
CREATE OR REPLACE FUNCTION public.on_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recipient uuid;
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;

  IF EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = NEW.conversation_id) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
    SELECT cm.user_id, NEW.sender_id, 'message', NEW.conversation_id
    FROM public.conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id AND cm.user_id != NEW.sender_id;
  ELSE
    SELECT CASE WHEN user_a = NEW.sender_id THEN user_b ELSE user_a END
      INTO v_recipient FROM public.conversations WHERE id = NEW.conversation_id;
    IF v_recipient IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
      VALUES (v_recipient, NEW.sender_id, 'message', NEW.conversation_id);
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- ====================================================================
-- 4. RPC Function: join_squad_multimatch
-- Permite unirse atómicamente a un squad/proyecto, crea o amplía la conversación grupal y notifica
-- ====================================================================
CREATE OR REPLACE FUNCTION public.join_squad_multimatch(p_collab_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_collab record;
  v_conv record;
  v_conv_id uuid;
  v_applicant_id uuid;
  v_applicant_name text;
  v_applicant_disc text;
  v_participant record;
BEGIN
  v_applicant_id := auth.uid();
  IF v_applicant_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_collab FROM public.collaborations WHERE id = p_collab_id;
  IF v_collab IS NULL THEN
    RAISE EXCEPTION 'Proyecto o squad no encontrado';
  END IF;

  SELECT display_name, COALESCE(discipline::text, 'Artista') INTO v_applicant_name, v_applicant_disc
  FROM public.profiles WHERE id = v_applicant_id;

  -- 1. Insertar participante en el proyecto si no existe
  INSERT INTO public.collaboration_participants (collab_id, user_id, role)
  VALUES (p_collab_id, v_applicant_id, 'member')
  ON CONFLICT (collab_id, user_id) DO NOTHING;

  -- 2. Buscar si ya existe una conversación de grupo vinculada a este collab
  SELECT * INTO v_conv FROM public.conversations WHERE collab_id = p_collab_id AND is_group = true LIMIT 1;

  IF v_conv IS NULL THEN
    INSERT INTO public.conversations (user_a, user_b, is_group, title, collab_id)
    VALUES (v_collab.owner_id, v_applicant_id, true, v_collab.title, p_collab_id)
    RETURNING id INTO v_conv_id;

    -- Agregar al owner
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES (v_conv_id, v_collab.owner_id, 'owner')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  ELSE
    v_conv_id := v_conv.id;
  END IF;

  -- Agregar todos los participantes históricos de la colaboración al chat
  FOR v_participant IN
    SELECT user_id FROM public.collaboration_participants WHERE collab_id = p_collab_id
  LOOP
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES (v_conv_id, v_participant.user_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;

  -- Asegurar que el solicitante está en conversation_members
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (v_conv_id, v_applicant_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- 3. Mensaje de bienvenida/anuncio en el chat grupal
  INSERT INTO public.messages (conversation_id, sender_id, content)
  VALUES (
    v_conv_id,
    v_applicant_id,
    '🎉 ¡Nuevo Multi-Match! Me he sumado al squad del proyecto "' || v_collab.title || '". ¡Un placer conectar y colaborar juntos!'
  );

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', v_conv_id,
    'collab_id', p_collab_id,
    'title', v_collab.title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_squad_multimatch(uuid) TO authenticated;
