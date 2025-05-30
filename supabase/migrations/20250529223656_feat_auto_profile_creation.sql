-- Add automatic profile creation trigger for authenticated users
-- This simplifies the architecture by removing the need for manual profile creation

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_coach_id uuid;
BEGIN
  -- Get default coach from app_config
  SELECT (value->>'default_coach_id')::uuid INTO default_coach_id
  FROM app_config 
  WHERE key = 'default_coach'
  LIMIT 1;
  
  -- If no default coach found, get the first active coach
  IF default_coach_id IS NULL THEN
    SELECT id INTO default_coach_id
    FROM coaches
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;
  END IF;
  
  -- Create profile for the new user
  INSERT INTO profiles (
    id,
    coach_id,
    metadata
  ) VALUES (
    NEW.id,
    default_coach_id,
    jsonb_build_object(
      'created_via', 'auth_trigger',
      'created_at', NOW()
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    updated_at = NOW(),
    metadata = profiles.metadata || jsonb_build_object('last_trigger_update', NOW());
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_profile_on_signup();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_profile_on_signup() TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Comment for documentation
COMMENT ON FUNCTION create_profile_on_signup() IS 'Automatically creates a user profile when a new auth user is created';