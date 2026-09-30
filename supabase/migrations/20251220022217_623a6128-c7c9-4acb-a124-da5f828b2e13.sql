-- Create a trigger function to prevent non-admin users from manipulating metrics
CREATE OR REPLACE FUNCTION public.prevent_user_metrics_manipulation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If the user is an admin, allow all changes
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  -- For non-admin users, prevent changes to views_count and tokens_count
  IF OLD.views_count IS DISTINCT FROM NEW.views_count THEN
    NEW.views_count = OLD.views_count;
  END IF;
  
  IF OLD.tokens_count IS DISTINCT FROM NEW.tokens_count THEN
    NEW.tokens_count = OLD.tokens_count;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on instagram_posts table
DROP TRIGGER IF EXISTS prevent_metrics_manipulation ON public.instagram_posts;
CREATE TRIGGER prevent_metrics_manipulation
  BEFORE UPDATE ON public.instagram_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_metrics_manipulation();