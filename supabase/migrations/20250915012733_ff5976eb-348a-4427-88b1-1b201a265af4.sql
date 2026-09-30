-- Fix Admin Privilege Escalation Vulnerability
-- Remove duplicate policies on promoter_profiles table and add proper constraints

-- Drop duplicate policies that could allow privilege escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.promoter_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.promoter_profiles;

-- Create a single, secure update policy that prevents admin privilege escalation
CREATE POLICY "Users can update own profile except admin status" 
ON public.promoter_profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  (OLD.is_admin IS NOT DISTINCT FROM NEW.is_admin OR is_admin(auth.uid()))
);

-- Strengthen withdrawal_requests security
-- Add constraint to prevent negative withdrawal amounts
ALTER TABLE public.withdrawal_requests 
ADD CONSTRAINT withdrawal_amount_positive 
CHECK (amount > 0);

-- Add constraint to prevent withdrawal amounts over reasonable limits (e.g., $10,000)
ALTER TABLE public.withdrawal_requests 
ADD CONSTRAINT withdrawal_amount_reasonable 
CHECK (amount <= 10000);

-- Strengthen user_tokens security  
-- Add constraint to prevent negative balances
ALTER TABLE public.user_tokens 
ADD CONSTRAINT balance_non_negative 
CHECK (balance_usd >= 0);

-- Add constraint to prevent negative pending withdrawals
ALTER TABLE public.user_tokens 
ADD CONSTRAINT pending_withdrawal_non_negative 
CHECK (pending_withdrawal >= 0);

-- Add constraint to prevent unreasonable token amounts
ALTER TABLE public.user_tokens 
ADD CONSTRAINT total_tokens_reasonable 
CHECK (total_tokens >= 0 AND total_tokens <= 1000000);

-- Create audit logging for admin operations
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  target_user_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.admin_audit_log 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Only admins can insert audit logs
CREATE POLICY "Only admins can insert audit logs" 
ON public.admin_audit_log 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Add rate limiting table for withdrawal requests
CREATE TABLE IF NOT EXISTS public.withdrawal_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on rate limit table
ALTER TABLE public.withdrawal_rate_limit ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit data
CREATE POLICY "Users can view own rate limit" 
ON public.withdrawal_rate_limit 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to check withdrawal rate limit (max 3 per hour)
CREATE OR REPLACE FUNCTION public.check_withdrawal_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current count and window start for user
  SELECT request_count, window_start 
  INTO current_count, window_start_time
  FROM public.withdrawal_rate_limit 
  WHERE user_id = p_user_id;
  
  -- If no record exists, allow and create record
  IF current_count IS NULL THEN
    INSERT INTO public.withdrawal_rate_limit (user_id, request_count, window_start)
    VALUES (p_user_id, 1, now());
    RETURN TRUE;
  END IF;
  
  -- If window is older than 1 hour, reset
  IF window_start_time < (now() - INTERVAL '1 hour') THEN
    UPDATE public.withdrawal_rate_limit 
    SET request_count = 1, window_start = now()
    WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;
  
  -- If under limit (3 requests per hour), increment and allow
  IF current_count < 3 THEN
    UPDATE public.withdrawal_rate_limit 
    SET request_count = request_count + 1
    WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;
  
  -- Over limit, deny
  RETURN FALSE;
END;
$$;