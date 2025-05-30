-- Quick fix for anonymous user trigger
-- Check current handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Debug logging
  RAISE LOG 'handle_new_user triggered for user %', NEW.id;
  RAISE LOG 'User email: %, raw_app_meta_data: %', NEW.email, NEW.raw_app_meta_data;
  
  -- Check if this is an anonymous user
  -- Anonymous users have no email and specific metadata
  IF NEW.email IS NULL THEN
    RAISE LOG 'Processing anonymous user';
    -- Anonymous user - create profile with null email
    INSERT INTO public.profiles (id, email, metadata)
    VALUES (
      NEW.id,
      NULL,  -- Explicitly NULL for anonymous users
      jsonb_build_object(
        'created_via', 'auth_trigger',
        'is_anonymous', true,
        'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'anonymous')
      )
    );
  ELSE
    RAISE LOG 'Processing regular user with email %', NEW.email;
    -- Regular user
    INSERT INTO public.profiles (id, email, metadata)
    VALUES (
      NEW.id,
      NEW.email,
      jsonb_build_object(
        'created_via', 'auth_trigger',
        'is_anonymous', false
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();