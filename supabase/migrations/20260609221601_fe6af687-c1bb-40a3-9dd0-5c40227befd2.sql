
CREATE OR REPLACE FUNCTION public.bump_agreement_question_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  IF NEW.message_type <> 'answer' OR NEW.for_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT user_a, user_b INTO v_user_a, v_user_b
    FROM public.collab_agreements WHERE id = NEW.agreement_id;
  IF NEW.for_user_id = v_user_a THEN
    UPDATE public.collab_agreements
       SET questions_asked_a = questions_asked_a + 1
     WHERE id = NEW.agreement_id;
  ELSIF NEW.for_user_id = v_user_b THEN
    UPDATE public.collab_agreements
       SET questions_asked_b = questions_asked_b + 1
     WHERE id = NEW.agreement_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bump_agreement_question_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_bump_agreement_question_count
  AFTER INSERT ON public.collab_agreement_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_agreement_question_count();
