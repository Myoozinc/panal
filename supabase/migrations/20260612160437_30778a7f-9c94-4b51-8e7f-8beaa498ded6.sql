ALTER TABLE public.collab_agreements
  ADD COLUMN IF NOT EXISTS intent_a text,
  ADD COLUMN IF NOT EXISTS intent_b text,
  ADD COLUMN IF NOT EXISTS intent_translated_a text,
  ADD COLUMN IF NOT EXISTS intent_translated_b text;

ALTER TABLE public.collab_agreement_messages
  DROP CONSTRAINT IF EXISTS collab_agreement_messages_message_type_check;

ALTER TABLE public.collab_agreement_messages
  ADD CONSTRAINT collab_agreement_messages_message_type_check
  CHECK (message_type IN ('text','question','answer','agreement','system','intent_prompt','intent_answer','suggestion'));