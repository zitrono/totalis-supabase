-- Initial Schema Migration for Totalis
-- This migration creates the complete database schema with Phase 5.1 table naming conventions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Coaches Table
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'other')),
  year_of_birth INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_coaches_active ON coaches(is_active) WHERE is_active = true;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coaches" ON coaches
  FOR SELECT USING (is_active = true);

CREATE TRIGGER update_coaches_updated_at BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Profiles Table (formerly user_profiles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  year_of_birth INTEGER,
  sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  notification_settings JSONB DEFAULT '{}',
  mood_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_profiles_coach ON profiles(coach_id);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Categories Table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  name_short TEXT,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  primary_color TEXT,
  secondary_color TEXT,
  is_active BOOLEAN DEFAULT true,
  show_checkin_history BOOLEAN DEFAULT false,
  checkin_enabled BOOLEAN DEFAULT true,
  followup_timer INTEGER,
  prompt_checkin TEXT,
  prompt_checkin_2 TEXT,
  guidelines_file_text TEXT,
  max_questions INTEGER DEFAULT 5,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_sort ON categories(sort_order, name);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Profile Categories Table (formerly user_categories)
CREATE TABLE profile_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  last_checkin_at TIMESTAMPTZ,
  checkin_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, category_id)
);

CREATE INDEX idx_profile_categories_user ON profile_categories(user_id);
CREATE INDEX idx_profile_categories_category ON profile_categories(category_id);
CREATE INDEX idx_profile_categories_favorites ON profile_categories(user_id, is_favorite) WHERE is_favorite = true;
ALTER TABLE profile_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON profile_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON profile_categories
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_profile_categories_updated_at BEFORE UPDATE ON profile_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  parent_message_id UUID REFERENCES messages(id),
  conversation_id UUID,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'voice', 'checkin', 'feedback')),
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_category ON messages(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_messages_content_type ON messages(content_type);
CREATE INDEX idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC) WHERE conversation_id IS NOT NULL;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Checkins Table
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  wellness_level INTEGER CHECK (wellness_level BETWEEN 1 AND 10),
  summary TEXT,
  insight TEXT,
  brief TEXT,
  mood JSONB,
  questions_asked INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_checkins_user ON checkins(user_id);
CREATE INDEX idx_checkins_category ON checkins(category_id);
CREATE INDEX idx_checkins_status ON checkins(status);
CREATE INDEX idx_checkins_user_completed ON checkins(user_id, completed_at DESC) WHERE status = 'completed';
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own checkins" ON checkins
  FOR ALL USING (auth.uid() = user_id);

-- 7. Recommendations Table (formerly health_cards)
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  checkin_id UUID REFERENCES checkins(id),
  parent_recommendation_id UUID REFERENCES recommendations(id),
  title TEXT,
  recommendation_text TEXT NOT NULL,
  action TEXT,
  why TEXT,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('action', 'category')),
  importance INTEGER CHECK (importance BETWEEN 1 AND 5),
  relevance NUMERIC(3,2) CHECK (relevance BETWEEN 0 AND 1),
  recommended_categories UUID[] DEFAULT '{}',
  context TEXT,
  is_active BOOLEAN DEFAULT true,
  viewed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_recommendations_user ON recommendations(user_id);
CREATE INDEX idx_recommendations_type ON recommendations(recommendation_type);
CREATE INDEX idx_recommendations_parent ON recommendations(parent_recommendation_id) WHERE parent_recommendation_id IS NOT NULL;
CREATE INDEX idx_recommendations_active ON recommendations(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_recommendations_checkin ON recommendations(checkin_id) WHERE checkin_id IS NOT NULL;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" ON recommendations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recommendations" ON recommendations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. App Configuration Table
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public config" ON app_config
  FOR SELECT USING (is_public = true);

CREATE POLICY "Service role can manage all config" ON app_config
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Analytics Events Table
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_properties JSONB DEFAULT '{}',
  user_properties JSONB DEFAULT '{}',
  session_id TEXT,
  platform TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);

-- No RLS on analytics_events - only accessible via service role

-- 10. User Feedback Table
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general', 'complaint')),
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  context JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'wont_fix')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON user_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own feedback" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_feedback_updated_at BEFORE UPDATE ON user_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. App Versions Table
CREATE TABLE app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  minimum_supported BOOLEAN DEFAULT false,
  features JSONB DEFAULT '{}',
  release_notes TEXT,
  released_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_versions_platform ON app_versions(platform);
CREATE INDEX idx_app_versions_released ON app_versions(released_at DESC);

-- Public read access for app versions
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app versions" ON app_versions
  FOR SELECT USING (true);

-- 12. Audio Usage Logs Table
CREATE TABLE audio_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_seconds NUMERIC(10,2) NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  transcription_model TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_audio_usage_logs_user ON audio_usage_logs(user_id);
CREATE INDEX idx_audio_usage_logs_created ON audio_usage_logs(created_at DESC);
ALTER TABLE audio_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audio logs" ON audio_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert audio logs
CREATE POLICY "Service role can insert audio logs" ON audio_usage_logs
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create profile on user signup with default coach
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_default_coach_id UUID;
BEGIN
  -- Get default coach from config or use first active coach
  SELECT COALESCE(
    (SELECT value->>'default_coach_id' FROM app_config WHERE key = 'default_coach'),
    (SELECT id FROM coaches WHERE is_active = true AND name = 'Daniel' LIMIT 1),
    (SELECT id FROM coaches WHERE is_active = true ORDER BY created_at LIMIT 1)
  )::UUID INTO v_default_coach_id;
  
  INSERT INTO public.profiles (id, coach_id)
  VALUES (new.id, v_default_coach_id);
  
  -- Send welcome message from coach
  IF v_default_coach_id IS NOT NULL THEN
    INSERT INTO public.messages (
      user_id,
      coach_id,
      role,
      content,
      content_type,
      conversation_id,
      metadata
    ) VALUES (
      new.id,
      v_default_coach_id,
      'assistant',
      'Welcome to Totalis! I''m here to support your wellness journey. How can I help you today?',
      'text',
      gen_random_uuid(),
      jsonb_build_object('is_welcome', true)
    );
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Views

-- User Check-ins View
CREATE VIEW user_checkins AS
SELECT 
  c.id,
  c.user_id,
  c.category_id,
  c.started_at,
  c.completed_at,
  c.status,
  c.wellness_level,
  c.summary,
  c.insight,
  c.brief,
  c.mood,
  cat.name as category_name,
  pc.checkin_count
FROM checkins c
JOIN categories cat ON cat.id = c.category_id
LEFT JOIN profile_categories pc ON pc.user_id = c.user_id AND pc.category_id = c.category_id
WHERE c.status = 'completed';

-- User Stats View
CREATE VIEW user_stats AS
SELECT 
  u.id as user_id,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT c.id) as total_checkins,
  COUNT(DISTINCT pc.category_id) as categories_used,
  COUNT(DISTINCT pc.category_id) FILTER (WHERE pc.is_favorite) as favorite_categories,
  MAX(GREATEST(m.created_at, c.completed_at)) as last_activity
FROM auth.users u
LEFT JOIN messages m ON m.user_id = u.id
LEFT JOIN checkins c ON c.user_id = u.id AND c.status = 'completed'
LEFT JOIN profile_categories pc ON pc.user_id = u.id
GROUP BY u.id;

-- Audio usage analytics views
CREATE VIEW user_audio_usage AS
SELECT 
  user_id,
  COUNT(*) as total_transcriptions,
  SUM(duration_seconds) as total_duration_seconds,
  SUM(file_size_bytes) as total_bytes,
  AVG(duration_seconds) as avg_duration_seconds,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 minute') as recent_requests
FROM audio_usage_logs
WHERE success = true
GROUP BY user_id;

CREATE VIEW admin_audio_usage AS
SELECT 
  DATE_TRUNC('day', created_at) as usage_date,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_requests,
  SUM(duration_seconds) as total_duration_seconds,
  SUM(file_size_bytes) as total_bytes,
  COUNT(*) FILTER (WHERE NOT success) as failed_requests
FROM audio_usage_logs
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY usage_date DESC;

-- Utility Functions

-- Complete Check-in
CREATE OR REPLACE FUNCTION complete_checkin(
  p_checkin_id UUID,
  p_summary TEXT,
  p_insight TEXT,
  p_brief TEXT,
  p_mood JSONB,
  p_wellness_level INTEGER
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_category_id UUID;
BEGIN
  -- Update checkin record
  UPDATE checkins 
  SET 
    status = 'completed',
    completed_at = NOW(),
    summary = p_summary,
    insight = p_insight,
    brief = p_brief,
    mood = p_mood,
    wellness_level = p_wellness_level
  WHERE id = p_checkin_id
  RETURNING user_id, category_id INTO v_user_id, v_category_id;
  
  -- Update profile category stats
  INSERT INTO profile_categories (user_id, category_id, last_checkin_at, checkin_count)
  VALUES (v_user_id, v_category_id, NOW(), 1)
  ON CONFLICT (user_id, category_id) 
  DO UPDATE SET 
    last_checkin_at = NOW(),
    checkin_count = profile_categories.checkin_count + 1;
  
  RETURN p_checkin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Category Tree
CREATE OR REPLACE FUNCTION get_category_tree(p_parent_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  name TEXT,
  name_short TEXT,
  level INTEGER,
  path TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    SELECT 
      c.id,
      c.parent_id,
      c.name,
      c.name_short,
      1 as level,
      ARRAY[c.name] as path
    FROM categories c
    WHERE (c.parent_id IS NULL AND p_parent_id IS NULL) OR c.parent_id = p_parent_id
      AND c.is_active = true
    
    UNION ALL
    
    SELECT 
      c.id,
      c.parent_id,
      c.name,
      c.name_short,
      ct.level + 1,
      ct.path || c.name
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = true
  )
  SELECT * FROM category_tree
  ORDER BY path;
END;
$$ LANGUAGE plpgsql STABLE;

-- Analytics event logging
CREATE OR REPLACE FUNCTION log_analytics_event(
  p_user_id UUID,
  p_event_name TEXT,
  p_event_properties JSONB DEFAULT '{}',
  p_user_properties JSONB DEFAULT '{}',
  p_session_id TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    user_id,
    event_name,
    event_properties,
    user_properties,
    session_id,
    platform,
    app_version
  ) VALUES (
    p_user_id,
    p_event_name,
    p_event_properties,
    p_user_properties,
    p_session_id,
    p_platform,
    p_app_version
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle favorite
CREATE OR REPLACE FUNCTION toggle_favorite_category(
  p_user_id UUID,
  p_category_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_favorite BOOLEAN;
BEGIN
  INSERT INTO profile_categories (user_id, category_id, is_favorite)
  VALUES (p_user_id, p_category_id, true)
  ON CONFLICT (user_id, category_id)
  DO UPDATE SET is_favorite = NOT profile_categories.is_favorite
  RETURNING is_favorite INTO v_is_favorite;
  
  RETURN v_is_favorite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON messages, checkins, recommendations, profile_categories, user_feedback TO authenticated;
GRANT INSERT ON analytics_events, audio_usage_logs TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;