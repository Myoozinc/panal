
-- Switch helper functions used in RLS to SECURITY INVOKER.
-- Callers already have appropriate SELECT access on the underlying tables
-- via existing RLS, so these will continue to evaluate correctly.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
     WHERE id = _conv_id AND (user_a = _user_id OR user_b = _user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
     WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a)
  )
$$;
