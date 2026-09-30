-- Drop existing overlapping SELECT policies that may cause issues
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.promoter_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.promoter_profiles;

-- Create a single, clear SELECT policy
-- Users can ONLY read their own profile, admins can read all profiles
CREATE POLICY "Users read own profile, admins read all"
ON public.promoter_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR public.is_admin(auth.uid())
);