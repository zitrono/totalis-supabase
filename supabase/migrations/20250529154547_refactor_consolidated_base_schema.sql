-- Consolidated Base Schema Migration
-- Generated: 2025-05-29
-- This migration consolidates all previous migrations for authenticated users only
-- NO anonymous user support - simplified architecture

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

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
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User profiles (automatically created by trigger on auth.users insert)
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- Will match auth.uid()
    email TEXT UNIQUE,
    display_name TEXT,
    photo_url TEXT,
    phone TEXT,
    birthdate DATE,
    sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say')),
    coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Categories with hierarchy
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_short TEXT,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    checkin_enabled BOOLEAN DEFAULT true,
    primary_color TEXT,
    secondary_color TEXT,
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

-- Check-in sessions
CREATE TABLE check_in_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    session_type TEXT DEFAULT 'general',
    duration_seconds INTEGER,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User categories (renamed from user_categories for consistency)
CREATE TABLE user_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    preference_level INTEGER DEFAULT 0,
    last_engaged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, category_id)
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
    recommendation_type TEXT DEFAULT 'action' CHECK (recommendation_type IN ('action', 'category', 'insight')),
    priority INTEGER DEFAULT 0,
    is_read BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User recommendations junction table
CREATE TABLE user_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    interaction_type TEXT CHECK (interaction_type IN ('viewed', 'liked', 'dismissed', 'saved')),
    interacted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, recommendation_id, interaction_type)
);

-- Analytics events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Images storage reference
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_name TEXT NOT NULL DEFAULT 'app-images',
    file_path TEXT NOT NULL,
    content_type TEXT,
    size_bytes BIGINT,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Audio transcriptions
CREATE TABLE audio_transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    filename TEXT,
    transcription TEXT,
    duration_seconds NUMERIC,
    word_count INTEGER,
    language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    model_used TEXT,
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
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_coach_id ON profiles(coach_id);
CREATE INDEX idx_profiles_last_seen_at ON profiles(last_seen_at);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_profile_categories_user_id ON profile_categories(user_id);
CREATE INDEX idx_profile_categories_category_id ON profile_categories(category_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_check_in_sessions_user_id ON check_in_sessions(user_id);
CREATE INDEX idx_check_in_sessions_status ON check_in_sessions(status);
CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_parent_id ON recommendations(parent_id);
CREATE INDEX idx_recommendations_category_id ON recommendations(category_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_audio_transcriptions_user_id ON audio_transcriptions(user_id);
CREATE INDEX idx_audio_transcriptions_status ON audio_transcriptions(status);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update last seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles 
    SET last_seen_at = NOW() 
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- Log analytics event
CREATE OR REPLACE FUNCTION log_analytics_event(
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}'::jsonb,
    p_platform TEXT DEFAULT NULL,
    p_app_version TEXT DEFAULT NULL
)
RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO analytics_events (user_id, event_type, event_data, platform, app_version)
    VALUES (auth.uid(), p_event_type, p_event_data, p_platform, p_app_version);
END;
$$ LANGUAGE plpgsql;

-- Toggle favorite category
CREATE OR REPLACE FUNCTION toggle_favorite_category(p_category_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_favorite BOOLEAN;
BEGIN
    INSERT INTO profile_categories (user_id, category_id, is_favorite)
    VALUES (auth.uid(), p_category_id, true)
    ON CONFLICT (user_id, category_id) 
    DO UPDATE SET is_favorite = NOT profile_categories.is_favorite
    RETURNING is_favorite INTO v_is_favorite;
    
    RETURN v_is_favorite;
END;
$$ LANGUAGE plpgsql;

-- Complete check-in session
CREATE OR REPLACE FUNCTION complete_check_in(p_session_id UUID)
RETURNS check_in_sessions 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session check_in_sessions;
BEGIN
    UPDATE check_in_sessions
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE 
        id = p_session_id 
        AND user_id = auth.uid()
        AND status = 'active'
    RETURNING * INTO v_session;
    
    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'Check-in session not found or already completed';
    END IF;
    
    RETURN v_session;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get storage URL function
CREATE OR REPLACE FUNCTION get_storage_url(p_bucket TEXT, p_path TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project_id TEXT;
BEGIN
    -- Get project ID from config
    SELECT current_setting('app.settings.project_id', true) INTO v_project_id;
    
    IF v_project_id IS NULL THEN
        v_project_id := 'qdqbrqnqttyjegiupvri'; -- Default project ID
    END IF;
    
    RETURN format('https://%s.supabase.co/storage/v1/object/public/%s/%s', 
        v_project_id, p_bucket, p_path);
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER update_check_in_sessions_updated_at BEFORE UPDATE ON check_in_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_transcriptions_updated_at BEFORE UPDATE ON audio_transcriptions
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
    c.id as coach_id,
    c.name as coach_name,
    c.bio as coach_bio,
    c.photo_url as coach_photo_url,
    c.specialty as coach_specialty
FROM profiles p
LEFT JOIN coaches c ON c.id = p.coach_id
WHERE p.id = auth.uid();

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
WHERE c.is_active = true
ORDER BY c.sort_order, c.name;

-- User check-ins view
CREATE OR REPLACE VIEW user_check_ins AS
SELECT 
    cs.*,
    c.name as coach_name,
    c.photo_url as coach_photo_url,
    cat.name as category_name
FROM check_in_sessions cs
LEFT JOIN coaches c ON c.id = cs.coach_id
LEFT JOIN categories cat ON cat.id = cs.category_id
WHERE cs.user_id = auth.uid()
ORDER BY cs.created_at DESC;

-- User stats view
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    p.id as user_id,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT cs.id) as total_checkins,
    COUNT(DISTINCT r.id) as total_recommendations,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_completed) as completed_recommendations,
    MAX(m.created_at) as last_message_at,
    MAX(cs.created_at) as last_checkin_at
FROM profiles p
LEFT JOIN messages m ON m.user_id = p.id
LEFT JOIN check_in_sessions cs ON cs.user_id = p.id
LEFT JOIN recommendations r ON r.user_id = p.id
WHERE p.id = auth.uid()
GROUP BY p.id;

-- Mobile dashboard view
CREATE OR REPLACE VIEW mobile_user_dashboard AS
SELECT 
    p.id as user_id,
    p.display_name,
    p.photo_url,
    p.last_seen_at,
    COUNT(DISTINCT m.id) FILTER (WHERE NOT m.is_read AND m.role = 'assistant') as unread_messages,
    COUNT(DISTINCT r.id) FILTER (WHERE NOT r.is_read) as unread_recommendations,
    MAX(cs.created_at) as last_checkin_at,
    jsonb_build_object(
        'total_checkins', COUNT(DISTINCT cs.id),
        'total_messages', COUNT(DISTINCT m.id),
        'active_recommendations', COUNT(DISTINCT r.id) FILTER (WHERE NOT r.is_completed)
    ) as stats
FROM profiles p
LEFT JOIN messages m ON m.user_id = p.id
LEFT JOIN check_in_sessions cs ON cs.user_id = p.id
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
ALTER TABLE check_in_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Profiles policies (simplified)
CREATE POLICY "users_can_view_own_profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_can_update_own_profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_can_insert_own_profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "service_role_all_access_profiles" ON profiles
    FOR ALL TO service_role USING (true);

-- Coaches policies
CREATE POLICY "authenticated_users_can_view_coaches" ON coaches
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_all_access_coaches" ON coaches
    FOR ALL TO service_role USING (true);

-- Categories policies  
CREATE POLICY "authenticated_users_can_view_categories" ON categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_all_access_categories" ON categories
    FOR ALL TO service_role USING (true);

-- Profile categories policies
CREATE POLICY "users_can_view_own_profile_categories" ON profile_categories
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_manage_own_profile_categories" ON profile_categories
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "service_role_all_access_profile_categories" ON profile_categories
    FOR ALL TO service_role USING (true);

-- Messages policies
CREATE POLICY "users_can_view_own_messages" ON messages
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_create_own_messages" ON messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_update_own_messages" ON messages
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "service_role_all_access_messages" ON messages
    FOR ALL TO service_role USING (true);

-- Check-in sessions policies
CREATE POLICY "users_can_view_own_checkins" ON check_in_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_create_own_checkins" ON check_in_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_update_own_checkins" ON check_in_sessions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "service_role_all_access_check_in_sessions" ON check_in_sessions
    FOR ALL TO service_role USING (true);

-- User categories policies
CREATE POLICY "users_can_view_own_user_categories" ON user_categories
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_manage_own_user_categories" ON user_categories
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "service_role_all_access_user_categories" ON user_categories
    FOR ALL TO service_role USING (true);

-- Recommendations policies
CREATE POLICY "users_can_view_own_recommendations" ON recommendations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_update_own_recommendations" ON recommendations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "service_role_all_access_recommendations" ON recommendations
    FOR ALL TO service_role USING (true);

-- User recommendations policies
CREATE POLICY "users_can_view_own_user_recommendations" ON user_recommendations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_manage_own_user_recommendations" ON user_recommendations
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "service_role_all_access_user_recommendations" ON user_recommendations
    FOR ALL TO service_role USING (true);

-- Analytics events policies
CREATE POLICY "users_can_create_own_events" ON analytics_events
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "service_role_all_access_analytics_events" ON analytics_events
    FOR ALL TO service_role USING (true);

-- Images policies
CREATE POLICY "authenticated_users_can_view_public_images" ON images
    FOR SELECT USING (is_public = true AND auth.role() = 'authenticated');

CREATE POLICY "users_can_view_own_images" ON images
    FOR SELECT USING (uploaded_by = auth.uid());

CREATE POLICY "users_can_upload_images" ON images
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "service_role_all_access_images" ON images
    FOR ALL TO service_role USING (true);

-- Audio transcriptions policies
CREATE POLICY "users_can_view_own_transcriptions" ON audio_transcriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_create_own_transcriptions" ON audio_transcriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_role_all_access_audio_transcriptions" ON audio_transcriptions
    FOR ALL TO service_role USING (true);

-- System logs policies
CREATE POLICY "service_role_all_access_system_logs" ON system_logs
    FOR ALL TO service_role USING (true);

-- App config policies
CREATE POLICY "authenticated_users_can_view_public_config" ON app_config
    FOR SELECT USING (is_public = true AND auth.role() = 'authenticated');

CREATE POLICY "service_role_all_access_app_config" ON app_config
    FOR ALL TO service_role USING (true);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Storage bucket creation is handled in config.toml
-- RLS policies for storage will be applied via separate migration

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant function permissions
GRANT EXECUTE ON FUNCTION update_last_seen() TO authenticated;
GRANT EXECUTE ON FUNCTION log_analytics_event(TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_favorite_category(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_check_in(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_storage_url(TEXT, TEXT) TO authenticated;

-- Grant table permissions for authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON profile_categories TO authenticated;
GRANT INSERT, UPDATE ON messages TO authenticated;
GRANT INSERT, UPDATE ON check_in_sessions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_categories TO authenticated;
GRANT UPDATE ON recommendations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_recommendations TO authenticated;
GRANT INSERT ON analytics_events TO authenticated;
GRANT INSERT ON audio_transcriptions TO authenticated;

-- Grant view permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON SCHEMA public IS 'Simplified schema for authenticated users only - no anonymous access';
COMMENT ON TABLE profiles IS 'User profiles - automatically created by trigger on auth.users insert';
COMMENT ON TABLE messages IS 'Chat messages with role-based system for user/assistant/system messages';
COMMENT ON TABLE recommendations IS 'Health recommendations with hierarchical structure via parent_id';
COMMENT ON TABLE check_in_sessions IS 'User check-in sessions tracking wellness activities';
COMMENT ON FUNCTION update_last_seen() IS 'Updates the last_seen_at timestamp for the current user';
COMMENT ON FUNCTION toggle_favorite_category(UUID) IS 'Toggles favorite status for a category';

-- End of consolidated schema