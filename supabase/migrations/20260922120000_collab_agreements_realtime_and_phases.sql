-- Enable realtime for collab agreements and collab agreement messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'collab_agreements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_agreements;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'collab_agreement_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_agreement_messages;
  END IF;
END $$;

ALTER TABLE public.collab_agreements REPLICA IDENTITY FULL;
ALTER TABLE public.collab_agreement_messages REPLICA IDENTITY FULL;
