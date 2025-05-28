-- Fix anonymous auth by creating/fixing the get_storage_url function
-- This function is called by handle_new_user trigger

-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS public.get_storage_url(text, text);
DROP FUNCTION IF EXISTS public.get_storage_url(bucket text, text);

-- Create the helper function that builds a public URL for storage objects
CREATE FUNCTION public.get_storage_url(
  bucket text,
  object_path text
)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  -- Build the storage URL using Supabase's pattern
  SELECT 
    'https://qdqbrqnqttyjegiupvri.supabase.co/storage/v1/object/public/' || 
    bucket || '/' || 
    object_path;
$$;

-- Grant execute permission to ensure triggers can use it
GRANT EXECUTE ON FUNCTION public.get_storage_url(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_url(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_storage_url(text, text) TO service_role;

-- Also update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an anonymous user
  IF NEW.email IS NULL OR NEW.raw_app_meta_data->>'provider' = 'anonymous' THEN
    -- Anonymous user - create profile with null email
    INSERT INTO public.profiles (id, email, metadata)
    VALUES (
      NEW.id,
      NULL,
      jsonb_build_object(
        'created_via', 'auth_trigger',
        'is_anonymous', true,
        'provider', 'anonymous'
      )
    ) ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate key errors
  ELSE
    -- Regular user - create profile with email
    INSERT INTO public.profiles (id, email, metadata)
    VALUES (
      NEW.id,
      NEW.email,
      jsonb_build_object(
        'created_via', 'auth_trigger',
        'is_anonymous', false,
        'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
      )
    ) ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate key errors
  END IF;
  
  -- Check if there's a migrate_user_avatar function that needs the storage URL
  -- This is safe to call now that get_storage_url exists
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the user creation
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION get_storage_url IS 'Helper function to generate public storage URLs for buckets. Required by user creation triggers.';