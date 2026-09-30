
-- =====================================================
-- 1. PROFILES: verification + notification prefs
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"likes":true,"matches":true,"collab_tags":true,"messages":true}'::jsonb;

-- =====================================================
-- 2. USER ROLES (admin)
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. VERIFICATION REQUESTS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'pending',
  evidence_url text,
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own requests" ON public.verification_requests;
CREATE POLICY "Users see own requests" ON public.verification_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users create own request" ON public.verification_requests;
CREATE POLICY "Users create own request" ON public.verification_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins update requests" ON public.verification_requests;
CREATE POLICY "Admins update requests" ON public.verification_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 4. REPORTS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.report_reason AS ENUM ('spam', 'inappropriate', 'fake', 'harassment', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason public.report_reason NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_user_id)
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own reports" ON public.reports;
CREATE POLICY "Users see own reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users create reports" ON public.reports;
CREATE POLICY "Users create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- =====================================================
-- 5. BLOCKS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own blocks" ON public.blocks;
CREATE POLICY "Users see own blocks" ON public.blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users create blocks" ON public.blocks;
CREATE POLICY "Users create blocks" ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users delete own blocks" ON public.blocks;
CREATE POLICY "Users delete own blocks" ON public.blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- On block: delete matches and swipes between the two
CREATE OR REPLACE FUNCTION public.cleanup_on_block()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.matches
   WHERE (user_a = NEW.blocker_id AND user_b = NEW.blocked_id)
      OR (user_a = NEW.blocked_id AND user_b = NEW.blocker_id);
  DELETE FROM public.swipes
   WHERE (swiper_id = NEW.blocker_id AND swiped_id = NEW.blocked_id)
      OR (swiper_id = NEW.blocked_id AND swiped_id = NEW.blocker_id);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.cleanup_on_block() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cleanup_on_block ON public.blocks;
CREATE TRIGGER trg_cleanup_on_block AFTER INSERT ON public.blocks FOR EACH ROW EXECUTE FUNCTION public.cleanup_on_block();

-- =====================================================
-- 6. NOTIFICATIONS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('like', 'match', 'collab_tag', 'message');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  type public.notification_type NOT NULL,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- =====================================================
-- 7. CONVERSATIONS & MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE,
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members see conversation" ON public.conversations;
CREATE POLICY "Members see conversation" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
     WHERE id = _conv_id AND (user_a = _user_id OR user_b = _user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
     WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a)
  )
$$;

DROP POLICY IF EXISTS "Members see messages" ON public.messages;
CREATE POLICY "Members see messages" ON public.messages FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "Members send messages" ON public.messages;
CREATE POLICY "Members send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_member(conversation_id, auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.conversations c
     WHERE c.id = conversation_id
       AND public.is_blocked_between(c.user_a, c.user_b)
  )
);
DROP POLICY IF EXISTS "Members mark messages read" ON public.messages;
CREATE POLICY "Members mark messages read" ON public.messages FOR UPDATE TO authenticated USING (public.is_conversation_member(conversation_id, auth.uid()));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Update conversation last_message_at + create notification on new message
CREATE OR REPLACE FUNCTION public.on_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recipient uuid;
  v_other uuid;
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  SELECT CASE WHEN user_a = NEW.sender_id THEN user_b ELSE user_a END
    INTO v_recipient FROM public.conversations WHERE id = NEW.conversation_id;
  IF v_recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
    VALUES (v_recipient, NEW.sender_id, 'message', NEW.conversation_id);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.on_new_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_on_new_message ON public.messages;
CREATE TRIGGER trg_on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.on_new_message();

-- =====================================================
-- 8. NOTIFICATION TRIGGERS (likes, matches, collab tags)
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.direction = 'like' THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
    VALUES (NEW.swiped_id, NEW.swiper_id, 'like', NEW.id);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.swipes;
CREATE TRIGGER trg_notify_on_like AFTER INSERT ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Replace match trigger: also notify both users + create conversation
CREATE OR REPLACE FUNCTION public.create_match_on_mutual_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match_id uuid;
BEGIN
  IF NEW.direction = 'like' AND EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_id = NEW.swiped_id AND swiped_id = NEW.swiper_id AND direction = 'like'
  ) THEN
    INSERT INTO public.matches (user_a, user_b)
    VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id))
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_match_id;

    IF v_match_id IS NOT NULL THEN
      INSERT INTO public.conversations (match_id, user_a, user_b)
      VALUES (v_match_id, LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id))
      ON CONFLICT (match_id) DO NOTHING;

      INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
      VALUES
        (NEW.swiper_id, NEW.swiped_id, 'match', v_match_id),
        (NEW.swiped_id, NEW.swiper_id, 'match', v_match_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_collab_tag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.collaborations WHERE id = NEW.collab_id;
  IF NEW.user_id <> v_owner THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
    VALUES (NEW.user_id, v_owner, 'collab_tag', NEW.collab_id);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_on_collab_tag() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_on_collab_tag ON public.collaboration_participants;
CREATE TRIGGER trg_notify_on_collab_tag AFTER INSERT ON public.collaboration_participants FOR EACH ROW EXECUTE FUNCTION public.notify_on_collab_tag();

-- Wire match trigger if missing
DROP TRIGGER IF EXISTS trg_create_match ON public.swipes;
CREATE TRIGGER trg_create_match AFTER INSERT ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.create_match_on_mutual_like();

-- =====================================================
-- 9. AVATARS STORAGE BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
