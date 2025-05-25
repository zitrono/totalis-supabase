-- Temporary fix: Disable the trigger that's causing issues
-- This will allow users to be created without automatic profile creation
-- We'll handle profile creation in the application code

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Verify the trigger is dropped
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';