-- Fix security warnings by setting search_path in all database functions

-- Fix validate_instagram_url function
CREATE OR REPLACE FUNCTION public.validate_instagram_url(url text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Check if URL contains instagram.com domain
  RETURN url ~* '^https?://(www\.)?instagram\.com/';
END;
$function$;

-- Fix calculate_tokens_from_views function
CREATE OR REPLACE FUNCTION public.calculate_tokens_from_views()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Calculate tokens as 0.1% of views (1:1000 ratio)
  NEW.tokens_count = GREATEST(COALESCE(NEW.views_count, 0) / 1000, 0);
  
  -- Update user_tokens table to reflect the change in tokens
  UPDATE public.user_tokens
  SET total_tokens = (
    SELECT COALESCE(SUM(tokens_count), 0)
    FROM public.instagram_posts
    WHERE user_id = NEW.user_id
  )
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Fix check_is_rejected_exists function
CREATE OR REPLACE FUNCTION public.check_is_rejected_exists()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'instagram_posts'
    AND column_name = 'is_rejected'
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Insert into promoter_profiles
  INSERT INTO public.promoter_profiles (id, username, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  -- Insert into user_tokens
  INSERT INTO public.user_tokens (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$function$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 STABLE
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.promoter_profiles
    WHERE id = user_id AND is_admin = true
  );
$function$;

-- Fix mark_post_as_rejected function (UUID version)
CREATE OR REPLACE FUNCTION public.mark_post_as_rejected(post_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  column_exists boolean;
  result json;
BEGIN
  -- Check if the column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'instagram_posts'
    AND column_name = 'is_rejected'
  ) INTO column_exists;
  
  -- If the column exists, update the post
  IF column_exists THEN
    UPDATE public.instagram_posts
    SET is_rejected = true
    WHERE id = post_id;
    
    result := json_build_object('success', true, 'message', 'Post marked as rejected');
  ELSE
    -- If the column doesn't exist, return a message
    result := json_build_object('success', false, 'message', 'is_rejected column does not exist');
  END IF;
  
  RETURN result;
END;
$function$;

-- Remove the empty mark_post_as_rejected function (bigint version)
DROP FUNCTION IF EXISTS public.mark_post_as_rejected(post_id bigint);