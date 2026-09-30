-- Update Instagram URL validation to be stricter
-- Now validates actual post/reel/story URL structure
CREATE OR REPLACE FUNCTION public.validate_instagram_url(url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Check if URL is a valid Instagram post, reel, or story URL
  -- Valid formats:
  -- https://www.instagram.com/p/{post-id}/
  -- https://instagram.com/reel/{reel-id}/
  -- https://www.instagram.com/stories/{username}/{story-id}/
  RETURN url ~* '^https?://(www\.)?instagram\.com/(p|reel|reels|stories/[A-Za-z0-9._]+)/[A-Za-z0-9_-]+/?(\?.*)?$';
END;
$function$;