-- Fix handle_new_user function to properly handle anonymous users created by Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an anonymous user
  -- Anonymous users have no email and specific metadata
  IF NEW.email IS NULL AND NEW.raw_app_meta_data->>'provider' = 'anonymous' THEN
    -- Anonymous user is already properly marked by Supabase
    -- Just create the profile
    INSERT INTO public.profiles (id, email, metadata)
    VALUES (
      NEW.id,
      NEW.email,
      jsonb_build_object(
        'created_via', 'auth_trigger',
        'is_anonymous', true,
        'provider', 'anonymous'
      )
    );
  ELSE
    -- Regular user or legacy anonymous user pattern
    IF NEW.email LIKE '%@anonymous.totalis.app' THEN
      -- Legacy anonymous user pattern - update metadata
      UPDATE auth.users
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
                             '{"provider": "anonymous", "is_anonymous": true}'::jsonb
      WHERE id = NEW.id;
    END IF;
    
    -- Create profile for user
    INSERT INTO public.profiles (id, email, metadata)
    VALUES (
      NEW.id,
      NEW.email,
      jsonb_build_object(
        'created_via', 'auth_trigger',
        'is_anonymous', (NEW.email IS NULL OR NEW.email LIKE '%@anonymous.totalis.app')
      )
    );
  END IF;

  RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing profiles table constraint to allow NULL emails for anonymous users
ALTER TABLE profiles 
  ALTER COLUMN email DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON FUNCTION handle_new_user() IS 'Handles both Supabase native anonymous users (null email) and legacy anonymous pattern (email ending with @anonymous.totalis.app)';