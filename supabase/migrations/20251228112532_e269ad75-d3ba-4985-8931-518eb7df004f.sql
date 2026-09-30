-- Drop all existing RESTRICTIVE policies on withdrawal_requests
DROP POLICY IF EXISTS "Admins can delete withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create their own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON public.withdrawal_requests;

-- Recreate all policies as PERMISSIVE (explicit)
-- Users can view their own withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests"
ON public.withdrawal_requests
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all withdrawal requests
CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Users can create their own withdrawal requests
CREATE POLICY "Users can create their own withdrawal requests"
ON public.withdrawal_requests
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can update withdrawal requests
CREATE POLICY "Admins can update withdrawal requests"
ON public.withdrawal_requests
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Admins can delete withdrawal requests
CREATE POLICY "Admins can delete withdrawal requests"
ON public.withdrawal_requests
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));