
-- Enums
CREATE TYPE public.discipline_type AS ENUM ('producer','musician','singer','dancer','other');
CREATE TYPE public.experience_level AS ENUM ('beginner','intermediate','pro');
CREATE TYPE public.swipe_direction AS ENUM ('like','pass');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  username text UNIQUE,
  avatar_url text,
  bio text,
  city text,
  country text,
  discipline public.discipline_type,
  genres text[],
  skills text[],
  experience_level public.experience_level,
  years_active integer,
  looking_for public.discipline_type[],
  instagram_url text,
  spotify_url text,
  soundcloud_url text,
  youtube_url text,
  website_url text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Collaborations
CREATE TABLE public.collaborations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_url text,
  spotify_url text,
  youtube_url text,
  soundcloud_url text,
  instagram_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collabs viewable by authenticated" ON public.collaborations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create collabs" ON public.collaborations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update collabs" ON public.collaborations
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete collabs" ON public.collaborations
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Participants
CREATE TABLE public.collaboration_participants (
  collab_id uuid NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collab_id, user_id)
);
ALTER TABLE public.collaboration_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants viewable by authenticated" ON public.collaboration_participants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can add participants" ON public.collaboration_participants
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.collaborations c WHERE c.id = collab_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "Users can leave collabs" ON public.collaboration_participants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Swipes
CREATE TABLE public.swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  swiped_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction public.swipe_direction NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (swiper_id, swiped_id)
);
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own swipes" ON public.swipes
  FOR SELECT TO authenticated USING (auth.uid() = swiper_id);
CREATE POLICY "Users create own swipes" ON public.swipes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = swiper_id);

-- Matches
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b)
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own matches" ON public.matches
  FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER set_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_collabs_updated BEFORE UPDATE ON public.collaborations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Match on mutual like
CREATE OR REPLACE FUNCTION public.create_match_on_mutual_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.direction = 'like' AND EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_id = NEW.swiped_id AND swiped_id = NEW.swiper_id AND direction = 'like'
  ) THEN
    INSERT INTO public.matches (user_a, user_b)
    VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id))
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_swipe_created
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.create_match_on_mutual_like();

REVOKE EXECUTE ON FUNCTION public.handle_new_user(), public.create_match_on_mutual_like(), public.update_updated_at_column() FROM anon, authenticated;
