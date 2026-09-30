-- Fix: Restrict instagram_posts SELECT to authenticated users only (users see their own, admins see all)
-- This prevents anonymous users from tracking user activity

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all posts" ON instagram_posts;

-- Create restricted policy: users can view their own posts, admins can view all
CREATE POLICY "Users can view own posts" ON instagram_posts AS PERMISSIVE 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all posts" ON instagram_posts AS PERMISSIVE 
FOR SELECT USING (is_admin(auth.uid()));