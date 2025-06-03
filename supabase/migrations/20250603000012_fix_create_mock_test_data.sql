-- Create mock test data for preview environments (v4.2.17)
-- Since preview branches can't create auth.users, we'll create mock data
-- that allows tests to run without authentication

-- In our schema, profiles.id IS the user_id (references auth.users)
-- We'll create mock profiles using the test user IDs
INSERT INTO profiles (id, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Assign coaches to test profiles
UPDATE profiles 
SET coach_id = (SELECT id FROM coaches WHERE name = 'Daniel' LIMIT 1)
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333'
) AND coach_id IS NULL;

-- Create some categories for test users
INSERT INTO profile_categories (user_id, category_id, created_at, updated_at)
SELECT 
  p.id as user_id,
  c.id,
  NOW(),
  NOW()
FROM profiles p
CROSS JOIN categories c
WHERE p.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
)
  AND c.parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM profile_categories pc 
    WHERE pc.user_id = p.id AND pc.category_id = c.id
  )
LIMIT 12; -- 3 users x 4 root categories

-- Create some test messages
INSERT INTO messages (user_id, category_id, content, role, created_at, updated_at)
SELECT 
  p.id as user_id,
  pc.category_id,
  'Test message for ' || c.name,
  'user',
  NOW(),
  NOW()
FROM profiles p
JOIN profile_categories pc ON pc.user_id = p.id
JOIN categories c ON c.id = pc.category_id
WHERE p.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
)
  AND NOT EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.user_id = p.id AND m.category_id = pc.category_id
  )
LIMIT 6; -- 2 messages per user

-- Create mock user function for tests in preview environment
CREATE OR REPLACE FUNCTION get_mock_user_id(email TEXT)
RETURNS UUID AS $$
BEGIN
  CASE email
    WHEN 'test1@totalis.app' THEN RETURN '11111111-1111-1111-1111-111111111111'::UUID;
    WHEN 'test2@totalis.app' THEN RETURN '22222222-2222-2222-2222-222222222222'::UUID;
    WHEN 'test3@totalis.app' THEN RETURN '33333333-3333-3333-3333-333333333333'::UUID;
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql;