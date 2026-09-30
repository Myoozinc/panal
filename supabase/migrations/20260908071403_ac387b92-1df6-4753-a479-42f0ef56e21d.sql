CREATE TABLE public.collab_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id uuid NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collab_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.collab_likes TO authenticated;
GRANT ALL ON public.collab_likes TO service_role;
ALTER TABLE public.collab_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by authenticated" ON public.collab_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own like" ON public.collab_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own like" ON public.collab_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_collab_likes_collab ON public.collab_likes(collab_id);

CREATE TABLE public.collab_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id uuid NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_comments TO authenticated;
GRANT ALL ON public.collab_comments TO service_role;
ALTER TABLE public.collab_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by authenticated" ON public.collab_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own comment" ON public.collab_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comment" ON public.collab_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author or collab owner deletes comment" ON public.collab_comments FOR DELETE TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.collaborations c WHERE c.id = collab_comments.collab_id AND c.owner_id = auth.uid())
);
CREATE INDEX idx_collab_comments_collab ON public.collab_comments(collab_id);
CREATE TRIGGER trg_collab_comments_updated_at BEFORE UPDATE ON public.collab_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();