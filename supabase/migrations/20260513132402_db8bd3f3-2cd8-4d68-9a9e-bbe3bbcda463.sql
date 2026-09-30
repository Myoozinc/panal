-- Remove broad SELECT policies that allow listing public buckets.
-- Public buckets remain readable via direct object URLs.
DROP POLICY IF EXISTS "Anyone can view release images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view artist images" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Collab covers are publicly accessible" ON storage.objects;