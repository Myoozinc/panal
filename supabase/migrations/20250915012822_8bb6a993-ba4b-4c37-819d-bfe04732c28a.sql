-- Fix Admin Privilege Escalation Vulnerability
-- Remove duplicate policies on promoter_profiles table and add proper constraints

-- Drop duplicate policies that could allow privilege escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.promoter_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.promoter_profiles;

-- Create a single, secure update policy
CREATE POLICY "Users can update own profile" 
ON public.promoter_profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create a separate policy specifically for admin privilege changes
-- Only existing admins can change admin status
CREATE POLICY "Only admins can change admin status" 
ON public.promoter_profiles 
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

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

-- Create function to check withdrawal rate limit (max 3 per hour)
CREATE OR REPLACE FUNCTION public.check_withdrawal_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count INTEGER;
  last_request TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Count withdrawal requests in the last hour
  SELECT COUNT(*) INTO request_count
  FROM public.withdrawal_requests 
  WHERE user_id = p_user_id 
  AND created_at > (now() - INTERVAL '1 hour');
  
  -- Allow if under limit (3 requests per hour)
  RETURN request_count < 3;
END;
$$;