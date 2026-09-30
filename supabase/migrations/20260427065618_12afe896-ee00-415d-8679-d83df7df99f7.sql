-- =========================================================
-- 1. DROP everything from SoundPay
-- =========================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.protect_admin_field() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_user_metrics_manipulation() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_tokens_from_views() CASCADE;
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_withdrawal_rate_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_instagram_url(text) CASCADE;
DROP FUNCTION IF EXISTS public.mark_post_as_rejected(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_is_rejected_exists() CASCADE;

DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;
DROP TABLE IF EXISTS public.instagram_posts CASCADE;
DROP TABLE IF EXISTS public.user_tokens CASCADE;
DROP TABLE IF EXISTS public.releases CASCADE;
DROP TABLE IF EXISTS public.artists CASCADE;
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;
DROP TABLE IF EXISTS public.promoter_profiles CASCADE;

-- =========================================================
-- 2. Shared utilities
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- 3. Enums
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.discipline_type AS ENUM ('producer','musician','singer','dancer','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.experience_level AS ENUM ('beginner','intermediate','pro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.swipe_direction AS ENUM ('like','pass');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========================================================
-- 4. profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  username TEXT UNIQUE,
  bio TEXT,
  city TEXT,
  country TEXT,
  avatar_url TEXT,
  discipline public.discipline_type,
  genres TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  experience_level public.experience_level,
  years_active INT,
  looking_for public.discipline_type[] DEFAULT '{}',
  spotify_url TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  soundcloud_url TEXT,
  website_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 5. swipes
-- =========================================================
CREATE TABLE public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction public.swipe_direction NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (swiper_id, swiped_id),
  CHECK (swiper_id <> swiped_id)
);

CREATE INDEX idx_swipes_swiper ON public.swipes(swiper_id);
CREATE INDEX idx_swipes_swiped ON public.swipes(swiped_id);

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own swipes"
  ON public.swipes FOR SELECT TO authenticated USING (auth.uid() = swiper_id);

CREATE POLICY "Users can create own swipes"
  ON public.swipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = swiper_id);

-- =========================================================
-- 6. matches
-- =========================================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE INDEX idx_matches_user_a ON public.matches(user_a);
CREATE INDEX idx_matches_user_b ON public.matches(user_b);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matches"
  ON public.matches FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Trigger: create match when mutual like
CREATE OR REPLACE FUNCTION public.create_match_on_mutual_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reciprocal_exists BOOLEAN;
  ua UUID;
  ub UUID;
BEGIN
  IF NEW.direction <> 'like' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction = 'like'
  ) INTO reciprocal_exists;

  IF reciprocal_exists THEN
    IF NEW.swiper_id < NEW.swiped_id THEN
      ua := NEW.swiper_id; ub := NEW.swiped_id;
    ELSE
      ua := NEW.swiped_id; ub := NEW.swiper_id;
    END IF;

    INSERT INTO public.matches (user_a, user_b)
    VALUES (ua, ub)
    ON CONFLICT (user_a, user_b) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_swipe_create_match
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.create_match_on_mutual_like();

-- =========================================================
-- 7. collaborations
-- =========================================================
CREATE TABLE public.collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  spotify_url TEXT,
  youtube_url TEXT,
  soundcloud_url TEXT,
  instagram_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collaborations_owner ON public.collaborations(owner_id);
CREATE INDEX idx_collaborations_created ON public.collaborations(created_at DESC);

ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view collaborations"
  ON public.collaborations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own collaborations"
  ON public.collaborations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own collaborations"
  ON public.collaborations FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own collaborations"
  ON public.collaborations FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER update_collaborations_updated_at
  BEFORE UPDATE ON public.collaborations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 8. collaboration_participants
-- =========================================================
CREATE TABLE public.collaboration_participants (
  collab_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collab_id, user_id)
);

CREATE INDEX idx_collab_participants_user ON public.collaboration_participants(user_id);

ALTER TABLE public.collaboration_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view participants"
  ON public.collaboration_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner can add participants"
  ON public.collaboration_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = collab_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can remove participants"
  ON public.collaboration_participants FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = collab_id AND c.owner_id = auth.uid()
    )
  );

-- =========================================================
-- 9. Storage buckets + policies
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('collabs', 'collabs', true)
ON CONFLICT (id) DO NOTHING;

-- Drop old bucket policies (if they exist) by name from previous SoundPay setup
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Collab covers are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own collab covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own collab covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own collab covers" ON storage.objects;

-- Avatars bucket policies (file path: <user_id>/<filename>)
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Collab covers bucket policies
CREATE POLICY "Collab covers are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'collabs');

CREATE POLICY "Users can upload their own collab covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'collabs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own collab covers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'collabs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own collab covers"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'collabs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Backfill profiles for any existing auth users
INSERT INTO public.profiles (id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
ON CONFLICT (id) DO NOTHING;