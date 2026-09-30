
-- 1. Tighten messages UPDATE policy + trigger preventing field tampering
DROP POLICY IF EXISTS "Members mark messages read" ON public.messages;

CREATE POLICY "Recipients mark messages read"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  public.is_conversation_member(conversation_id, auth.uid())
  AND sender_id <> auth.uid()
)
WITH CHECK (
  public.is_conversation_member(conversation_id, auth.uid())
  AND sender_id <> auth.uid()
);

CREATE OR REPLACE FUNCTION public.messages_restrict_update_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_at may be updated on messages';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_restrict_update_fields_trg ON public.messages;
CREATE TRIGGER messages_restrict_update_fields_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_restrict_update_fields();

-- 2. Realtime channel authorization
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users subscribe to own notifications channel" ON realtime.messages;
CREATE POLICY "Users subscribe to own notifications channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifs-' || auth.uid()::text
);

DROP POLICY IF EXISTS "Members subscribe to conversation channel" ON realtime.messages;
CREATE POLICY "Members subscribe to conversation channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'msg-%'
  AND public.is_conversation_member(
    NULLIF(substring(realtime.topic() FROM 5), '')::uuid,
    auth.uid()
  )
);

-- 3. Revoke EXECUTE on SECURITY DEFINER trigger functions from clients
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_match_on_mutual_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_collab_tag() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_on_block() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_admin_if_authorized() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.messages_restrict_update_fields() FROM PUBLIC, anon, authenticated;

-- 4. Prevent listing of avatars bucket; public URL reads still work for public buckets
DROP POLICY IF EXISTS "Avatar images publicly accessible" ON storage.objects;
