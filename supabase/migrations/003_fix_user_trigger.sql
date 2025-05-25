-- Fix user creation trigger

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a more robust version of the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_coach_id UUID;
BEGIN
  -- Get default coach
  BEGIN
    -- First try to get from config
    SELECT (value->>'default_coach_id')::UUID INTO v_default_coach_id
    FROM app_config 
    WHERE key = 'default_coach' 
    AND value->>'default_coach_id' IS NOT NULL
    LIMIT 1;
    
    -- If not in config, get Daniel
    IF v_default_coach_id IS NULL THEN
      SELECT id INTO v_default_coach_id
      FROM coaches 
      WHERE is_active = true 
      AND name = 'Daniel' 
      LIMIT 1;
    END IF;
    
    -- If still null, get any active coach
    IF v_default_coach_id IS NULL THEN
      SELECT id INTO v_default_coach_id
      FROM coaches 
      WHERE is_active = true 
      ORDER BY created_at 
      LIMIT 1;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error, just set to null
      v_default_coach_id := NULL;
  END;
  
  -- Create user profile
  BEGIN
    INSERT INTO public.user_profiles (id, coach_id, created_at, updated_at)
    VALUES (
      NEW.id, 
      v_default_coach_id,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the user creation
      RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.coaches TO anon, authenticated;
GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;

-- Test the function manually
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Simulate trigger execution
  INSERT INTO auth.users (id, email, created_at, updated_at)
  VALUES (test_user_id, 'trigger-test@example.com', NOW(), NOW());
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = test_user_id) THEN
    RAISE NOTICE 'Trigger test passed!';
  ELSE
    RAISE WARNING 'Trigger test failed - profile not created';
  END IF;
  
  -- Clean up
  DELETE FROM public.user_profiles WHERE id = test_user_id;
  DELETE FROM auth.users WHERE id = test_user_id;
END $$;