-- Simplify RLS policies by removing anonymous user support
-- This migration updates all RLS policies to work with authenticated users only

-- Drop all existing RLS policies to recreate them simplified
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on our tables
    FOR r IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN (
            'profiles', 'coaches', 'categories', 'profile_categories',
            'check_in_sessions', 'user_categories', 'messages',
            'recommendations', 'user_recommendations', 'images',
            'app_config', 'audio_transcriptions', 'account_links'
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

-- Profiles table policies (simplified)
CREATE POLICY "users_can_view_own_profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_can_update_own_profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_can_insert_own_profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Coaches table policies
CREATE POLICY "authenticated_users_can_view_coaches" ON coaches
    FOR SELECT USING (auth.role() = 'authenticated');

-- Categories table policies  
CREATE POLICY "authenticated_users_can_view_categories" ON categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Profile categories policies
CREATE POLICY "users_can_view_own_categories" ON profile_categories
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_manage_own_categories" ON profile_categories
    FOR ALL USING (user_id = auth.uid());

-- Check-in sessions policies
CREATE POLICY "users_can_view_own_checkins" ON check_in_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_create_own_checkins" ON check_in_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_update_own_checkins" ON check_in_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- User categories policies
CREATE POLICY "users_can_view_own_user_categories" ON user_categories
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_manage_own_user_categories" ON user_categories
    FOR ALL USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "users_can_view_own_messages" ON messages
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_create_own_messages" ON messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Recommendations policies
CREATE POLICY "users_can_view_own_recommendations" ON recommendations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_create_own_recommendations" ON recommendations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_update_own_recommendations" ON recommendations
    FOR UPDATE USING (user_id = auth.uid());

-- User recommendations policies
CREATE POLICY "users_can_view_own_user_recommendations" ON user_recommendations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_manage_own_user_recommendations" ON user_recommendations
    FOR ALL USING (user_id = auth.uid());

-- Images policies
CREATE POLICY "authenticated_users_can_view_images" ON images
    FOR SELECT USING (auth.role() = 'authenticated');

-- App config policies
CREATE POLICY "authenticated_users_can_view_public_config" ON app_config
    FOR SELECT USING (is_public = true AND auth.role() = 'authenticated');

-- Audio transcriptions policies
CREATE POLICY "users_can_view_own_transcriptions" ON audio_transcriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_create_own_transcriptions" ON audio_transcriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Service role policies for all tables (for admin operations)
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN (
            'profiles', 'coaches', 'categories', 'profile_categories',
            'check_in_sessions', 'user_categories', 'messages',
            'recommendations', 'user_recommendations', 'images',
            'app_config', 'audio_transcriptions'
        )
    LOOP
        EXECUTE format('CREATE POLICY "service_role_all_access_%s" ON %I FOR ALL TO service_role USING (true)', t, t);
    END LOOP;
END $$;

-- Add comment explaining the simplification
COMMENT ON SCHEMA public IS 'Simplified schema with authenticated users only - no anonymous access';