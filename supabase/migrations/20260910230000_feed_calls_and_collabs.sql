-- ====================================================================
-- Add support for Llamados / Convocatorias (Open Calls) in collaborations
-- ====================================================================
ALTER TABLE public.collaborations
  ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'collab',
  ADD COLUMN IF NOT EXISTS target_discipline text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS compensation text;

-- Index for filtering by post_type
CREATE INDEX IF NOT EXISTS idx_collaborations_post_type 
  ON public.collaborations(post_type, created_at DESC);
