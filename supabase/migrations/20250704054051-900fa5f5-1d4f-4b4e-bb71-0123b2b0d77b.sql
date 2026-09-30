-- Remove overly permissive RLS policies that allow any user to view all data

-- Drop the "Users can view all tokens" policy from user_tokens table
DROP POLICY IF EXISTS "Users can view all tokens" ON public.user_tokens;

-- Drop the "Users can view all profiles" policy from promoter_profiles table  
DROP POLICY IF EXISTS "Users can view all profiles" ON public.promoter_profiles;

-- Add input validation function for Instagram URLs
CREATE OR REPLACE FUNCTION public.validate_instagram_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if URL contains instagram.com domain
  RETURN url ~* '^https?://(www\.)?instagram\.com/';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint to ensure Instagram URLs are valid
ALTER TABLE public.instagram_posts 
ADD CONSTRAINT check_valid_instagram_url 
CHECK (validate_instagram_url(instagram_url));

-- Add constraint to prevent negative values in user_tokens
ALTER TABLE public.user_tokens 
ADD CONSTRAINT check_non_negative_tokens 
CHECK (total_tokens >= 0);

ALTER TABLE public.user_tokens 
ADD CONSTRAINT check_non_negative_balance 
CHECK (balance_usd >= 0);

ALTER TABLE public.user_tokens 
ADD CONSTRAINT check_non_negative_pending 
CHECK (pending_withdrawal >= 0);