-- Drop the existing SELECT policy that might be too permissive
DROP POLICY IF EXISTS "Users read own profile, admins read all" ON public.promoter_profiles;

-- Create separate, explicit policies for better security clarity
-- Policy 1: Users can only read their own profile
CREATE POLICY "Users can read own profile"
ON public.promoter_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Admins can read all profiles (uses security definer function to avoid recursion)
CREATE POLICY "Admins can read all profiles"
ON public.promoter_profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));