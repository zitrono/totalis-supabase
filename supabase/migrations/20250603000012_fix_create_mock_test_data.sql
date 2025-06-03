-- Create mock test data for preview environments (v4.2.17)
-- Since preview branches can't create auth.users, we'll create mock data
-- that allows tests to run without authentication

-- Create a mock profiles entry for tests that don't require auth
INSERT INTO profiles (user_id, email, first_name, last_name, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test1@totalis.app', 'Test', 'User1', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'test2@totalis.app', 'Test', 'User2', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'test3@totalis.app', 'Test', 'User3', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Assign coaches to test profiles
UPDATE profiles 
SET coach_id = (SELECT id FROM coaches WHERE name = 'Daniel' LIMIT 1)
WHERE email LIKE 'test%@totalis.app' AND coach_id IS NULL;

-- Create some categories for test users
INSERT INTO profile_categories (user_id, category_id, created_at, updated_at)
SELECT 
  p.user_id,
  c.id,
  NOW(),
  NOW()
FROM profiles p
CROSS JOIN categories c
WHERE p.email LIKE 'test%@totalis.app'
  AND c.parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM profile_categories pc 
    WHERE pc.user_id = p.user_id AND pc.category_id = c.id
  )
LIMIT 12; -- 3 users x 4 root categories

-- Create some test messages
INSERT INTO messages (user_id, category_id, content, role, created_at, updated_at)
SELECT 
  p.user_id,
  pc.category_id,
  'Test message for ' || c.name,
  'user',
  NOW(),
  NOW()
FROM profiles p
JOIN profile_categories pc ON pc.user_id = p.user_id
JOIN categories c ON c.id = pc.category_id
WHERE p.email LIKE 'test%@totalis.app'
  AND NOT EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.user_id = p.user_id AND m.category_id = pc.category_id
  )
LIMIT 6; -- 2 messages per test user

-- Create function to get mock user ID for tests
CREATE OR REPLACE FUNCTION get_test_user_id(test_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT user_id FROM profiles WHERE email = test_email LIMIT 1;
$$;

-- Grant execute to public so tests can use it
GRANT EXECUTE ON FUNCTION get_test_user_id TO anon, authenticated;