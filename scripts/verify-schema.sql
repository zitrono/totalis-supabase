
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check coaches table
SELECT * FROM coaches;

-- Check app_config
SELECT * FROM app_config;

-- Test anonymous user creation (in a transaction)
BEGIN;
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), null);
-- Should see a user_profile created
SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 1;
ROLLBACK;
