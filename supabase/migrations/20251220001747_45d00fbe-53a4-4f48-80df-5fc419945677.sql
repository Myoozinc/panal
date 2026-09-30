-- Fix 1: Create artists storage bucket with proper size limits
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('artists', 'artists', true, 10485760)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 10485760;

-- Fix 2: Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- Drop and recreate withdrawal_requests policies
DROP POLICY IF EXISTS "Admins can delete withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can create their own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON withdrawal_requests;

CREATE POLICY "Admins can delete withdrawal requests" ON withdrawal_requests AS PERMISSIVE FOR DELETE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update withdrawal requests" ON withdrawal_requests AS PERMISSIVE FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can view all withdrawal requests" ON withdrawal_requests AS PERMISSIVE FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can create their own withdrawal requests" ON withdrawal_requests AS PERMISSIVE FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own withdrawal requests" ON withdrawal_requests AS PERMISSIVE FOR SELECT USING (auth.uid() = user_id);

-- Drop and recreate releases policies
DROP POLICY IF EXISTS "Allow all users to view releases" ON releases;
DROP POLICY IF EXISTS "Only admins can delete releases" ON releases;
DROP POLICY IF EXISTS "Only admins can insert releases" ON releases;
DROP POLICY IF EXISTS "Only admins can update releases" ON releases;

CREATE POLICY "Allow all users to view releases" ON releases AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Only admins can delete releases" ON releases AS PERMISSIVE FOR DELETE USING (is_admin(auth.uid()));
CREATE POLICY "Only admins can insert releases" ON releases AS PERMISSIVE FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can update releases" ON releases AS PERMISSIVE FOR UPDATE USING (is_admin(auth.uid()));

-- Drop and recreate artists policies
DROP POLICY IF EXISTS "Admins can manage artists" ON artists;
DROP POLICY IF EXISTS "Anyone can view artists" ON artists;

CREATE POLICY "Admins can manage artists" ON artists AS PERMISSIVE FOR ALL USING (EXISTS (SELECT 1 FROM promoter_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Anyone can view artists" ON artists AS PERMISSIVE FOR SELECT USING (true);

-- Drop and recreate admin_audit_log policies
DROP POLICY IF EXISTS "Only admins can insert audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Only admins can view audit logs" ON admin_audit_log;

CREATE POLICY "Only admins can insert audit logs" ON admin_audit_log AS PERMISSIVE FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can view audit logs" ON admin_audit_log AS PERMISSIVE FOR SELECT USING (is_admin(auth.uid()));

-- Drop and recreate user_tokens policies
DROP POLICY IF EXISTS "Admins can read all tokens" ON user_tokens;
DROP POLICY IF EXISTS "Admins can update all tokens" ON user_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON user_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON user_tokens;
DROP POLICY IF EXISTS "Users can view their own tokens" ON user_tokens;

CREATE POLICY "Admins can read all tokens" ON user_tokens AS PERMISSIVE FOR SELECT USING (auth.uid() IN (SELECT id FROM promoter_profiles WHERE is_admin = true));
CREATE POLICY "Admins can update all tokens" ON user_tokens AS PERMISSIVE FOR UPDATE USING (auth.uid() IN (SELECT id FROM promoter_profiles WHERE is_admin = true)) WITH CHECK (auth.uid() IN (SELECT id FROM promoter_profiles WHERE is_admin = true));
CREATE POLICY "Users can insert their own tokens" ON user_tokens AS PERMISSIVE FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tokens" ON user_tokens AS PERMISSIVE FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own tokens" ON user_tokens AS PERMISSIVE FOR SELECT USING (auth.uid() = user_id);

-- Drop and recreate instagram_posts policies
DROP POLICY IF EXISTS "Admins can update all posts" ON instagram_posts;
DROP POLICY IF EXISTS "Posts must have valid artist_id" ON instagram_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can view all posts" ON instagram_posts;

CREATE POLICY "Admins can update all posts" ON instagram_posts AS PERMISSIVE FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Posts must have valid artist_id" ON instagram_posts AS PERMISSIVE FOR INSERT WITH CHECK ((artist_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM artists WHERE id = instagram_posts.artist_id)));
CREATE POLICY "Users can delete their own posts" ON instagram_posts AS PERMISSIVE FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own posts" ON instagram_posts AS PERMISSIVE FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON instagram_posts AS PERMISSIVE FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view all posts" ON instagram_posts AS PERMISSIVE FOR SELECT USING (true);

-- Drop and recreate promoter_profiles policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON promoter_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON promoter_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON promoter_profiles;
DROP POLICY IF EXISTS "Users read own profile, admins read all" ON promoter_profiles;

CREATE POLICY "Admins can update all profiles" ON promoter_profiles AS PERMISSIVE FOR UPDATE USING ((auth.uid() = id) OR is_admin(auth.uid())) WITH CHECK ((auth.uid() = id) OR is_admin(auth.uid()));
CREATE POLICY "Users can insert their own profile" ON promoter_profiles AS PERMISSIVE FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON promoter_profiles AS PERMISSIVE FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users read own profile, admins read all" ON promoter_profiles AS PERMISSIVE FOR SELECT USING ((auth.uid() = id) OR is_admin(auth.uid()));

-- Drop and recreate storage policies (if they exist as RESTRICTIVE)
DROP POLICY IF EXISTS "Anyone can view artist images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can upload artist images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update artist images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete artist images" ON storage.objects;

CREATE POLICY "Anyone can view artist images" ON storage.objects AS PERMISSIVE FOR SELECT USING (bucket_id = 'artists');
CREATE POLICY "Only admins can upload artist images" ON storage.objects AS PERMISSIVE FOR INSERT WITH CHECK (bucket_id = 'artists' AND public.is_admin(auth.uid()));
CREATE POLICY "Only admins can update artist images" ON storage.objects AS PERMISSIVE FOR UPDATE USING (bucket_id = 'artists' AND public.is_admin(auth.uid()));
CREATE POLICY "Only admins can delete artist images" ON storage.objects AS PERMISSIVE FOR DELETE USING (bucket_id = 'artists' AND public.is_admin(auth.uid()));