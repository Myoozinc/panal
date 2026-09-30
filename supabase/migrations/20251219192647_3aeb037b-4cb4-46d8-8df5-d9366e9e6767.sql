-- Create a trigger function that prevents non-admins from changing is_admin field
CREATE OR REPLACE FUNCTION public.protect_admin_field()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If is_admin field is being changed
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    -- Only allow if the current user is already an admin
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Solo los administradores pueden modificar el estado de administrador';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on promoter_profiles to protect is_admin field
DROP TRIGGER IF EXISTS protect_admin_field_trigger ON public.promoter_profiles;
CREATE TRIGGER protect_admin_field_trigger
  BEFORE UPDATE ON public.promoter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_field();

-- Drop the redundant/conflicting UPDATE policy that could cause confusion
DROP POLICY IF EXISTS "Only admins can change admin status" ON public.promoter_profiles;

-- Also clean up duplicate artists policies
DROP POLICY IF EXISTS "Everyone can view artists" ON public.promoter_profiles;
DROP POLICY IF EXISTS "Everyone can view artists" ON public.artists;