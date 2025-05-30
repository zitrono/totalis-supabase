-- Simplify RLS policies by removing anonymous user support
-- This migration updates only existing tables

-- Drop all existing RLS policies on known tables
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on our tables that exist
    FOR r IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN (
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('profiles', 'coaches', 'categories', 'app_config')
        )
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                r.policyname, r.schemaname, r.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors when dropping policies
            NULL;
        END;
    END LOOP;
END $$;

-- Only create policies for tables that exist
DO $$
BEGIN
    -- Profiles table policies (if table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE POLICY "users_can_view_own_profile" ON profiles
            FOR SELECT USING (id = auth.uid());
        
        CREATE POLICY "users_can_update_own_profile" ON profiles
            FOR UPDATE USING (id = auth.uid());
        
        CREATE POLICY "users_can_insert_own_profile" ON profiles
            FOR INSERT WITH CHECK (id = auth.uid());
    END IF;

    -- Coaches table policies (if table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coaches') THEN
        CREATE POLICY "authenticated_users_can_view_coaches" ON coaches
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    -- Categories table policies (if table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
        CREATE POLICY "authenticated_users_can_view_categories" ON categories
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    -- App config policies (if table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_config') THEN
        CREATE POLICY "authenticated_users_can_view_public_config" ON app_config
            FOR SELECT USING (is_public = true AND auth.role() = 'authenticated');
    END IF;
END $$;

-- Service role policies for all existing tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'coaches', 'categories', 'app_config')
    LOOP
        EXECUTE format('CREATE POLICY "service_role_all_access_%s" ON %I FOR ALL TO service_role USING (true)', t, t);
    END LOOP;
END $$;

-- Add comment explaining the simplification
COMMENT ON SCHEMA public IS 'Simplified schema with authenticated users only - no anonymous access';