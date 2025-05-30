-- Consolidated Base Schema Migration
-- Generated: 2025-05-29
-- This migration consolidates all previous migrations with JWT-based auth
-- NO direct auth.users modifications - uses JWT claims and RPC functions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE auth_type AS ENUM ('none', 'anon', 'permanent', 'service');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Coaches table
CREATE TABLE coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    bio TEXT,
    photo_url TEXT,
    sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say')),
    year_of_birth INTEGER,
    specialty TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User profiles (NO direct reference to auth.users)
-- Profile creation handled by RPC function after auth
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- Will match auth.uid() when created
    email TEXT UNIQUE,
    display_name TEXT,
    photo_url TEXT,
    phone TEXT,
    birthdate DATE,
    sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Categories with hierarchy
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User-category relationships
CREATE TABLE profile_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_favorite BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, category_id)
);

-- Messages with role system
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
    conversation_id UUID,
    session_id UUID,
    content TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'assistant', 'system')),
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'voice', 'checkin', 'feedback')),
    is_read BOOLEAN DEFAULT false,
    is_from_coach BOOLEAN GENERATED ALWAYS AS (role = 'assistant') STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Checkin sessions
CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
    template_id UUID,
    mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 5),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    notes TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Checkin templates
CREATE TABLE checkin_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Checkin answers
CREATE TABLE checkin_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    answer_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Recommendations (health cards)
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    recommendation_type TEXT DEFAULT 'action' CHECK (recommendation_type IN ('action', 'category')),
    is_read BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Analytics events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general', 'complaint')),
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
    app_version TEXT,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Audio transcriptions
CREATE TABLE audio_transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    audio_file_path TEXT NOT NULL,
    transcription_text TEXT,
    duration_seconds INTEGER,
    language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Voice messages
CREATE TABLE voice_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    duration_seconds INTEGER,
    transcription_id UUID REFERENCES audio_transcriptions(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'transcribed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- System logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_level TEXT NOT NULL CHECK (log_level IN ('debug', 'info', 'warning', 'error')),
    component TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App configuration
CREATE TABLE app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App versions
CREATE TABLE app_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    version TEXT NOT NULL,
    build_number TEXT,
    release_notes TEXT,
    is_required BOOLEAN DEFAULT false,
    released_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Account linking for anonymous users
CREATE TABLE account_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anonymous_user_id UUID NOT NULL,
    authenticated_user_id UUID NOT NULL,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Test cleanup log
CREATE TABLE test_cleanup_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cleaned_count INTEGER NOT NULL,
    cleanup_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_last_seen ON profiles(last_seen);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_profile_categories_user_id ON profile_categories(user_id);
CREATE INDEX idx_profile_categories_category_id ON profile_categories(category_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_checkins_user_id ON checkins(user_id);
CREATE INDEX idx_checkins_status ON checkins(status);
CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_parent_id ON recommendations(parent_id);
CREATE INDEX idx_recommendations_category_id ON recommendations(category_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_audio_transcriptions_user_id ON audio_transcriptions(user_id);
CREATE INDEX idx_audio_transcriptions_status ON audio_transcriptions(status);
CREATE INDEX idx_voice_messages_user_id ON voice_messages(user_id);
CREATE INDEX idx_voice_messages_transcription_id ON voice_messages(transcription_id);

-- =====================================================
-- JWT-BASED FUNCTIONS (No auth.users access)
-- =====================================================

-- Check authentication type from JWT
CREATE OR REPLACE FUNCTION check_auth_type()
RETURNS auth_type AS $$
DECLARE
    jwt_role TEXT;
    jwt_email TEXT;
    jwt_provider TEXT;
BEGIN
    -- Get info from JWT only
    jwt_role := auth.jwt()->>'role';
    jwt_email := auth.jwt()->>'email';
    jwt_provider := auth.jwt()->'app_metadata'->>'provider';
    
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

-- Create or update profile (called by app after auth)
CREATE OR REPLACE FUNCTION create_profile_if_needed()
RETURNS profiles AS $$
DECLARE
    current_user_id UUID;
    current_email TEXT;
    current_provider TEXT;
    user_profile profiles;
BEGIN
    -- Get current user info from JWT claims only
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Get user info from JWT claims
    current_email := auth.jwt()->>'email';
    current_provider := COALESCE(
        auth.jwt()->'app_metadata'->>'provider',
        'email'
    );
    
    -- Create or update profile
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
        last_login = NOW(),
        last_seen = NOW(),
        metadata = profiles.metadata || jsonb_build_object(
            'last_seen', NOW(),
            'provider', current_provider
        )
    RETURNING * INTO user_profile;
    
    RETURN user_profile;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Update last seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS void AS $$
BEGIN
    UPDATE profiles 
    SET last_seen = NOW() 
    WHERE id = auth.uid();
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Log analytics event
CREATE OR REPLACE FUNCTION log_analytics_event(
    event_name TEXT,
    event_data JSONB DEFAULT '{}'::jsonb,
    platform TEXT DEFAULT NULL,
    app_version TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO analytics_events (user_id, event_name, event_data, platform, app_version)
    VALUES (auth.uid(), event_name, event_data, platform, app_version);
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle favorite category
CREATE OR REPLACE FUNCTION toggle_favorite_category(category_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_fav BOOLEAN;
BEGIN
    -- Ensure profile exists
    PERFORM create_profile_if_needed();
    
    -- Toggle favorite status
    INSERT INTO profile_categories (user_id, category_id, is_favorite)
    VALUES (auth.uid(), category_uuid, true)
    ON CONFLICT (user_id, category_id) 
    DO UPDATE SET is_favorite = NOT profile_categories.is_favorite
    RETURNING is_favorite INTO is_fav;
    
    RETURN is_fav;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Complete checkin
CREATE OR REPLACE FUNCTION complete_checkin(checkin_uuid UUID)
RETURNS checkins AS $$
DECLARE
    completed_checkin checkins;
BEGIN
    UPDATE checkins
    SET 
        status = 'completed',
        completed_at = NOW()
    WHERE 
        id = checkin_uuid 
        AND user_id = auth.uid()
        AND status = 'in_progress'
    RETURNING * INTO completed_checkin;
    
    IF completed_checkin.id IS NULL THEN
        RAISE EXCEPTION 'Checkin not found or already completed';
    END IF;
    
    RETURN completed_checkin;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Mark data as test data
CREATE OR REPLACE FUNCTION mark_as_test_data(record_id UUID, table_name TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET metadata = metadata || ''{"is_test_data": true}''::jsonb WHERE id = $1',
        table_name
    ) USING record_id;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at BEFORE UPDATE ON coaches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_categories_updated_at BEFORE UPDATE ON profile_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON checkins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkin_templates_updated_at BEFORE UPDATE ON checkin_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_transcriptions_updated_at BEFORE UPDATE ON audio_transcriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_messages_updated_at BEFORE UPDATE ON voice_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- =====================================================

-- User profiles with coaches
CREATE OR REPLACE VIEW user_profiles_with_coaches AS
SELECT 
    p.*,
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'bio', c.bio,
                'photo_url', c.photo_url,
                'specialty', c.specialty
            )
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::jsonb
    ) as coaches
FROM profiles p
LEFT JOIN messages m ON m.user_id = p.id AND m.role = 'assistant'
LEFT JOIN coaches c ON c.id = m.coach_id
WHERE p.id = auth.uid()
GROUP BY p.id;

-- Categories with user preferences
CREATE OR REPLACE VIEW categories_with_user_preferences AS
SELECT 
    c.*,
    CASE 
        WHEN pc.id IS NOT NULL THEN true 
        ELSE false 
    END as is_selected,
    pc.is_favorite,
    pc.sort_order as user_sort_order
FROM categories c
LEFT JOIN profile_categories pc ON pc.category_id = c.id 
    AND pc.user_id = auth.uid()
ORDER BY c.sort_order, c.name;

-- User checkins view
CREATE OR REPLACE VIEW user_checkins AS
SELECT 
    c.*,
    co.name as coach_name,
    co.photo_url as coach_photo_url,
    COUNT(ca.id) as answer_count
FROM checkins c
LEFT JOIN coaches co ON co.id = c.coach_id
LEFT JOIN checkin_answers ca ON ca.checkin_id = c.id
WHERE c.user_id = auth.uid()
GROUP BY c.id, co.id, co.name, co.photo_url
ORDER BY c.created_at DESC;

-- User stats view
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    p.id as user_id,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT c.id) as total_checkins,
    COUNT(DISTINCT r.id) as total_recommendations,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_completed) as completed_recommendations,
    MAX(m.created_at) as last_message_at,
    MAX(c.created_at) as last_checkin_at
FROM profiles p
LEFT JOIN messages m ON m.user_id = p.id
LEFT JOIN checkins c ON c.user_id = p.id
LEFT JOIN recommendations r ON r.user_id = p.id
WHERE p.id = auth.uid()
GROUP BY p.id;

-- Mobile dashboard view
CREATE OR REPLACE VIEW mobile_user_dashboard AS
SELECT 
    p.id as user_id,
    p.display_name,
    p.photo_url,
    p.last_seen,
    COUNT(DISTINCT m.id) FILTER (WHERE NOT m.is_read AND m.role = 'assistant') as unread_messages,
    COUNT(DISTINCT r.id) FILTER (WHERE NOT r.is_read) as unread_recommendations,
    MAX(c.created_at) as last_checkin_at,
    jsonb_build_object(
        'total_checkins', COUNT(DISTINCT c.id),
        'total_messages', COUNT(DISTINCT m.id),
        'active_recommendations', COUNT(DISTINCT r.id) FILTER (WHERE NOT r.is_completed)
    ) as stats
FROM profiles p
LEFT JOIN messages m ON m.user_id = p.id
LEFT JOIN checkins c ON c.user_id = p.id
LEFT JOIN recommendations r ON r.user_id = p.id
WHERE p.id = auth.uid()
GROUP BY p.id;

-- Mobile recommendations feed
CREATE OR REPLACE VIEW mobile_recommendations_feed AS
SELECT 
    r.*,
    c.name as category_name,
    c.parent_id as category_parent_id,
    co.name as coach_name,
    co.photo_url as coach_photo_url,
    CASE 
        WHEN r.created_at > (NOW() - INTERVAL '24 hours') THEN true 
        ELSE false 
    END as is_new
FROM recommendations r
LEFT JOIN categories c ON c.id = r.category_id
LEFT JOIN coaches co ON co.id = r.coach_id
WHERE r.user_id = auth.uid()
ORDER BY r.created_at DESC;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cleanup_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid() OR check_auth_type() = 'service');

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid() AND check_auth_type() IN ('permanent', 'service'));

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Service role has full access to profiles" ON profiles
    FOR ALL USING (check_auth_type() = 'service');

-- Coaches policies (public read)
CREATE POLICY "Anyone can view coaches" ON coaches
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage coaches" ON coaches
    FOR ALL USING (check_auth_type() = 'service');

-- Categories policies (public read)
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage categories" ON categories
    FOR ALL USING (check_auth_type() = 'service');

-- Profile categories policies
CREATE POLICY "Users can manage own categories" ON profile_categories
    FOR ALL USING (user_id = auth.uid() OR check_auth_type() = 'service');

-- Messages policies
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (user_id = auth.uid() OR check_auth_type() = 'service');

CREATE POLICY "Permanent users can create messages" ON messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND 
        check_auth_type() IN ('permanent', 'service')
    );

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (
        user_id = auth.uid() AND 
        check_auth_type() IN ('permanent', 'service')
    );

-- Checkins policies
CREATE POLICY "Users can manage own checkins" ON checkins
    FOR ALL USING (user_id = auth.uid() OR check_auth_type() = 'service');

-- Checkin templates policies (public read)
CREATE POLICY "Anyone can view active templates" ON checkin_templates
    FOR SELECT USING (is_active = true OR check_auth_type() = 'service');

CREATE POLICY "Service role can manage templates" ON checkin_templates
    FOR ALL USING (check_auth_type() = 'service');

-- Checkin answers policies
CREATE POLICY "Users can manage own answers" ON checkin_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM checkins 
            WHERE checkins.id = checkin_answers.checkin_id 
            AND checkins.user_id = auth.uid()
        ) OR check_auth_type() = 'service'
    );

-- Recommendations policies
CREATE POLICY "Users can view own recommendations" ON recommendations
    FOR SELECT USING (user_id = auth.uid() OR check_auth_type() = 'service');

CREATE POLICY "Users can update own recommendations" ON recommendations
    FOR UPDATE USING (
        user_id = auth.uid() AND 
        check_auth_type() IN ('permanent', 'service')
    );

CREATE POLICY "Service role can manage recommendations" ON recommendations
    FOR ALL USING (check_auth_type() = 'service');

-- Analytics events policies
CREATE POLICY "Users can create own events" ON analytics_events
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Service role can view all events" ON analytics_events
    FOR SELECT USING (check_auth_type() = 'service');

-- User feedback policies
CREATE POLICY "Users can manage own feedback" ON user_feedback
    FOR ALL USING (user_id = auth.uid() OR check_auth_type() = 'service');

-- Audio transcriptions policies
CREATE POLICY "Users can manage own transcriptions" ON audio_transcriptions
    FOR ALL USING (user_id = auth.uid() OR check_auth_type() = 'service');

-- Voice messages policies
CREATE POLICY "Users can manage own voice messages" ON voice_messages
    FOR ALL USING (user_id = auth.uid() OR check_auth_type() = 'service');

-- System logs policies
CREATE POLICY "Service role can manage logs" ON system_logs
    FOR ALL USING (check_auth_type() = 'service');

CREATE POLICY "Users can create logs" ON system_logs
    FOR INSERT WITH CHECK (true);

-- App config policies (public read)
CREATE POLICY "Anyone can view config" ON app_config
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage config" ON app_config
    FOR ALL USING (check_auth_type() = 'service');

-- App versions policies (public read)
CREATE POLICY "Anyone can view versions" ON app_versions
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage versions" ON app_versions
    FOR ALL USING (check_auth_type() = 'service');

-- Account links policies
CREATE POLICY "Users can view own links" ON account_links
    FOR SELECT USING (
        anonymous_user_id = auth.uid() OR 
        authenticated_user_id = auth.uid() OR 
        check_auth_type() = 'service'
    );

CREATE POLICY "Service role can manage links" ON account_links
    FOR ALL USING (check_auth_type() = 'service');

-- Test cleanup log policies
CREATE POLICY "Service role can manage cleanup log" ON test_cleanup_log
    FOR ALL USING (check_auth_type() = 'service');

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Storage bucket creation is handled in config.toml
-- But we'll add the RLS policies here

-- Note: These policies will be created after bucket creation
-- They're included here for completeness

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant function permissions
GRANT EXECUTE ON FUNCTION create_profile_if_needed() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_auth_type() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_last_seen() TO authenticated;
GRANT EXECUTE ON FUNCTION log_analytics_event(TEXT, JSONB, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION toggle_favorite_category(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_checkin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_as_test_data(UUID, TEXT) TO service_role;

-- Grant table permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profile_categories TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON checkins TO authenticated;
GRANT ALL ON checkin_answers TO authenticated;
GRANT ALL ON recommendations TO authenticated;
GRANT ALL ON analytics_events TO authenticated;
GRANT ALL ON user_feedback TO authenticated;
GRANT ALL ON audio_transcriptions TO authenticated;
GRANT ALL ON voice_messages TO authenticated;

-- Public read access
GRANT SELECT ON categories TO anon;
GRANT SELECT ON coaches TO anon;
GRANT SELECT ON app_config TO anon;
GRANT SELECT ON app_versions TO anon;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- This will be handled by seed.sql file

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION create_profile_if_needed() IS 'Creates or updates user profile using JWT claims only. Must be called by app after authentication.';
COMMENT ON FUNCTION check_auth_type() IS 'Determines auth type from JWT claims without accessing auth.users table.';
COMMENT ON TABLE profiles IS 'User profiles - created via RPC call after authentication, no direct auth.users reference';
COMMENT ON TABLE messages IS 'Chat messages with role-based system for user/assistant/system messages';
COMMENT ON TABLE recommendations IS 'Health recommendations with hierarchical structure via parent_id';
COMMENT ON TABLE account_links IS 'Tracks anonymous to authenticated user account linking';

-- End of consolidated schema