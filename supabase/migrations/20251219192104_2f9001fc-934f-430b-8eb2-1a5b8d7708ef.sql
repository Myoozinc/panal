-- Drop existing policies on withdrawal_requests
DROP POLICY IF EXISTS "Users can create withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON public.withdrawal_requests;

-- Create secure RLS policies for withdrawal_requests
-- Only the request owner can view their own requests
CREATE POLICY "Users can view their own withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all withdrawal requests (using the existing is_admin function)
CREATE POLICY "Admins can view all withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Only the request owner can create their own requests
CREATE POLICY "Users can create their own withdrawal requests" 
ON public.withdrawal_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Only admins can update withdrawal requests (for processing)
CREATE POLICY "Admins can update withdrawal requests" 
ON public.withdrawal_requests 
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can delete withdrawal requests if needed
CREATE POLICY "Admins can delete withdrawal requests" 
ON public.withdrawal_requests 
FOR DELETE 
USING (public.is_admin(auth.uid()));