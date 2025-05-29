-- Add test users for integration testing
-- These users are required for the test suite to run properly

-- Enable anonymous sign-ins for testing
INSERT INTO auth.config (key, value) VALUES
  ('enable_anonymous_sign_ins', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create test users
DO $$
DECLARE
  test_user_id UUID;
  default_coach_id UUID;
BEGIN
  -- Get default coach ID
  SELECT id INTO default_coach_id FROM coaches WHERE name = 'Daniel' LIMIT 1;
  
  -- Create test users only if they don't exist
  FOR i IN 1..5 LOOP
    -- Check if user exists
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test' || i || '@totalis.app';
    
    IF test_user_id IS NULL THEN
      -- Create user ID
      test_user_id := gen_random_uuid();
      
      -- Insert into auth.users
      INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
      ) VALUES (
        test_user_id,
        'test' || i || '@totalis.app',
        crypt('Test123!@#', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('test_account', true),
        false,
        'authenticated'
      );
      
      -- Create profile
      INSERT INTO public.profiles (
        id,
        coach_id,
        metadata
      ) VALUES (
        test_user_id,
        default_coach_id,
        jsonb_build_object(
          'test_account', true,
          'permanent', true,
          'created_at', NOW()
        )
      );
      
      RAISE NOTICE 'Created test user: test%@totalis.app', i;
    ELSE
      RAISE NOTICE 'Test user already exists: test%@totalis.app', i;
    END IF;
  END LOOP;
END $$;