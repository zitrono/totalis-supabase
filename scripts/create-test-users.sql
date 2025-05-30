-- Create Pre-configured Test Users for Integration Testing
-- These users are NOT marked as test data and won't be deleted by cleanup
-- Apply this in Supabase Dashboard SQL Editor

-- Create a function to safely create test users
CREATE OR REPLACE FUNCTION create_test_user(
  email TEXT,
  password TEXT,
  display_name TEXT
) RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE auth.users.email = create_test_user.email;
  
  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;
  
  -- Create new user
  user_id := extensions.uuid_generate_v4();
  
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
    user_id,
    email,
    crypt(password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('display_name', display_name),
    false,
    'authenticated'
  );
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    display_name,
    email
  ) VALUES (
    user_id,
    display_name,
    email
  );
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test users
SELECT create_test_user('test1@totalis.test', 'Test123!@#', 'Test User 1');
SELECT create_test_user('test2@totalis.test', 'Test123!@#', 'Test User 2');
SELECT create_test_user('test3@totalis.test', 'Test123!@#', 'Test User 3');
SELECT create_test_user('test4@totalis.test', 'Test123!@#', 'Test User 4');
SELECT create_test_user('test5@totalis.test', 'Test123!@#', 'Test User 5');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT ON auth.users TO service_role;

-- Note: Test data cleanup is no longer needed as test data 
-- is isolated in preview branches which are automatically cleaned up

-- Verify test users were created
SELECT 
  p.id,
  p.email,
  p.display_name
FROM profiles p
WHERE p.email LIKE '%@totalis.test'
ORDER BY p.email;