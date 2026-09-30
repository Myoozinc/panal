-- Allow admins to update any instagram_posts (for approvals/rejections)
CREATE POLICY "Admins can update all posts"
ON public.instagram_posts
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));