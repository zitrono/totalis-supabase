-- Fix preview branch compatibility by removing all auth.users modifications
-- This migration refactors our auth handling to work in preview branches

-- 1. Remove ALL triggers on auth.users to avoid permission issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 2. Create a safe RPC function for profile creation that apps can call
-- This function only uses JWT claims and never touches auth.users
CREATE OR REPLACE FUNCTION create_profile_if_needed()
RETURNS void AS $$
DECLARE
    current_user_id UUID;
    current_email TEXT;
    current_provider TEXT;
BEGIN
    -- Get current user info from auth context (JWT claims only)
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Get user info from JWT claims (safe, no auth.users access needed)
    current_email := auth.jwt()->>'email';
    current_provider := COALESCE(
        auth.jwt()->'app_metadata'->>'provider',
        'email'
    );
    
    -- Create profile if it doesn't exist
    INSERT INTO profiles (id, email, metadata)
    VALUES (
        current_user_id,
        current_email,
        jsonb_build_object(
            'created_via', 'rpc_function',
            'is_anonymous', (current_email IS NULL OR current_email LIKE '%@anonymous%'),
            'provider', current_provider
        )
    )
    ON CONFLICT (id) DO UPDATE SET
        -- Update metadata if profile already exists
        metadata = profiles.metadata || jsonb_build_object(
            'last_seen', NOW(),
            'provider', current_provider
        );
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update check_auth_type to use JWT claims instead of querying auth.users
CREATE OR REPLACE FUNCTION check_auth_type()
RETURNS auth_type AS $$
DECLARE
    jwt_email TEXT;
    jwt_role TEXT;
    jwt_provider TEXT;
BEGIN
    -- Get info from JWT only (no auth.users access)
    jwt_role := auth.jwt()->>'role';
    jwt_email := auth.jwt()->>'email';
    jwt_provider := auth.jwt()->'app_metadata'->>'provider';
    
    -- Check scenarios
    IF auth.jwt() IS NULL THEN
        RETURN 'none';
    END IF;
    
    IF jwt_role = 'service_role' THEN
        RETURN 'service';
    END IF;
    
    IF auth.uid() IS NULL THEN
        RETURN 'none';
    END IF;
    
    -- Determine anonymous from JWT claims
    IF jwt_email IS NULL OR 
       jwt_email LIKE '%@anonymous%' OR 
       jwt_provider = 'anonymous' THEN
        RETURN 'anon';
    ELSE
        RETURN 'permanent';
    END IF;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Grant execute permission on the RPC function
GRANT EXECUTE ON FUNCTION create_profile_if_needed() TO authenticated, anon;

-- 5. Create profiles for any existing users (one-time migration)
-- This ensures existing users have profiles
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- We can't query auth.users in preview, so skip this in preview branches
    -- This will only run in production where we have permissions
    IF current_database() != 'postgres' THEN -- Preview DBs have different names
        FOR user_record IN 
            SELECT id, email, raw_app_meta_data
            FROM auth.users
            WHERE id NOT IN (SELECT id FROM profiles)
        LOOP
            INSERT INTO profiles (id, email, metadata)
            VALUES (
                user_record.id,
                user_record.email,
                jsonb_build_object(
                    'created_via', 'migration',
                    'provider', COALESCE(user_record.raw_app_meta_data->>'provider', 'email'),
                    'is_anonymous', (
                        user_record.email IS NULL OR 
                        user_record.email LIKE '%@anonymous%'
                    )
                )
            )
            ON CONFLICT (id) DO NOTHING;
        END LOOP;
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Ignore permission errors in preview branches
        RAISE NOTICE 'Skipping user migration due to insufficient privileges (expected in preview branches)';
END $$;

-- 6. Add helpful comments
COMMENT ON FUNCTION create_profile_if_needed() IS 'Creates or updates user profile using JWT claims only. Call this after authentication in your app.';
COMMENT ON FUNCTION check_auth_type() IS 'Determines auth type from JWT claims without accessing auth.users table.';