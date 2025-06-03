-- Ensure test users exist for integration tests (v4.2.17)
-- This is a workaround for preview environments not running seed.sql

DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Only create test users if they don't exist
  FOR i IN 1..3 LOOP
    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test' || i || '@totalis.app') THEN
      test_user_id := gen_random_uuid();
      
      -- Insert into auth.users
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        test_user_id,
        'authenticated',
        'authenticated',
        'test' || i || '@totalis.app',
        crypt('Test123!@#', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        false
      );
      
      -- Insert into auth.identities
      INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        test_user_id::text,
        test_user_id,
        jsonb_build_object(
          'sub', test_user_id::text,
          'email', 'test' || i || '@totalis.app',
          'email_verified', true,
          'provider', 'email'
        ),
        'email',
        NOW(),
        NOW(),
        NOW()
      );
      
      -- Create profile (trigger should handle this, but ensure it exists)
      INSERT INTO profiles (user_id, email, created_at, updated_at)
      VALUES (test_user_id, 'test' || i || '@totalis.app', NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
      RAISE NOTICE 'Created test user: test%@totalis.app', i;
    ELSE
      RAISE NOTICE 'Test user already exists: test%@totalis.app', i;
    END IF;
  END LOOP;
END $$;