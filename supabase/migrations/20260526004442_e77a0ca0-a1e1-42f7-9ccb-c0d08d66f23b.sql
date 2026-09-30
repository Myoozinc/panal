REVOKE UPDATE ON public.messages FROM authenticated, anon, PUBLIC;
GRANT UPDATE (read_at) ON public.messages TO authenticated;