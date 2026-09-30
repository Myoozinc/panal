
CREATE TYPE public.collab_agreement_status AS ENUM ('in_progress', 'pending_acceptance', 'accepted', 'renegotiating');

CREATE TABLE public.collab_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  status public.collab_agreement_status NOT NULL DEFAULT 'in_progress',
  agreement_document text,
  agreement_summary jsonb,
  accepted_by_a boolean NOT NULL DEFAULT false,
  accepted_by_b boolean NOT NULL DEFAULT false,
  user_a_role text,
  user_b_role text,
  questions_asked_a int NOT NULL DEFAULT 0,
  questions_asked_b int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.collab_agreements TO authenticated;
GRANT ALL ON public.collab_agreements TO service_role;

ALTER TABLE public.collab_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their agreement"
  ON public.collab_agreements FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can create their agreement"
  ON public.collab_agreements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Members can update their agreement"
  ON public.collab_agreements FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TRIGGER trg_collab_agreements_updated_at
  BEFORE UPDATE ON public.collab_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.collab_agreement_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.collab_agreements(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_role text NOT NULL CHECK (sender_role IN ('ai','user','system')),
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','question','answer','agreement','system')),
  content text NOT NULL,
  question_options jsonb,
  selected_option text,
  for_user_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.collab_agreement_messages TO authenticated;
GRANT ALL ON public.collab_agreement_messages TO service_role;

ALTER TABLE public.collab_agreement_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agreement messages"
  ON public.collab_agreement_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collab_agreements a
      WHERE a.id = agreement_id
        AND (auth.uid() = a.user_a OR auth.uid() = a.user_b OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Members can insert agreement messages"
  ON public.collab_agreement_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collab_agreements a
      WHERE a.id = agreement_id
        AND (auth.uid() = a.user_a OR auth.uid() = a.user_b)
    )
  );

CREATE INDEX idx_collab_msgs_agreement ON public.collab_agreement_messages(agreement_id, created_at);
