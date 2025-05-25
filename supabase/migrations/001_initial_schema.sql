-- Totalis Database Schema Migration
-- Generated: 2025-01-25
-- Description: Initial schema setup with all tables, indexes, and RLS policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. COACHES TABLE
-- Stores AI coach personalities that users can select
CREATE TABLE coaches (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Coach information
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'other')),
  year_of_birth INTEGER,
  
  -- Voice settings
  voice_id TEXT,
  voice_settings JSONB DEFAULT '{}',
  
  -- AI prompt
  prompt TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_coaches_active ON coaches(is_active) WHERE is_active = true;
CREATE INDEX idx_coaches_name ON coaches(name);

-- RLS Policies
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coaches" ON coaches
  FOR SELECT USING (is_active = true);

-- 2. USER PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
CREATE TABLE user_profiles (
  -- Primary key linked to auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile data
  name TEXT,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  year_of_birth INTEGER,
  sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  
  -- Settings
  notification_settings JSONB DEFAULT '{}',
  mood_config JSONB DEFAULT '{}',
  voice_enabled BOOLEAN DEFAULT true,
  
  -- App preferences
  language_code TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_coach ON user_profiles(coach_id);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. CATEGORIES TABLE
-- Hierarchical wellness categories for organizing content
CREATE TABLE categories (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hierarchy
  parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  
  -- Category info
  name TEXT NOT NULL,
  name_short TEXT,
  description TEXT,
  icon TEXT,
  
  -- Display settings
  sort_order INTEGER DEFAULT 0,
  primary_color TEXT,
  secondary_color TEXT,
  
  -- Feature flags
  is_active BOOLEAN DEFAULT true,
  show_checkin_history BOOLEAN DEFAULT false,
  checkin_enabled BOOLEAN DEFAULT true,
  followup_timer INTEGER, -- minutes until follow-up
  
  -- AI prompts for this category
  prompt_checkin TEXT,
  prompt_checkin_2 TEXT,
  guidelines_file_text TEXT,
  max_questions INTEGER DEFAULT 10,
  scope TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_sort ON categories(sort_order, name);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);

-- 4. USER CATEGORIES TABLE
-- Tracks user interactions with categories
CREATE TABLE user_categories (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  
  -- User preferences
  is_favorite BOOLEAN DEFAULT false,
  is_shortcut BOOLEAN DEFAULT false,
  
  -- Progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  last_checkin_at TIMESTAMPTZ,
  checkin_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(user_id, category_id)
);

-- Indexes
CREATE INDEX idx_user_categories_user ON user_categories(user_id);
CREATE INDEX idx_user_categories_category ON user_categories(category_id);
CREATE INDEX idx_user_categories_favorites ON user_categories(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_user_categories_shortcuts ON user_categories(user_id, is_shortcut) WHERE is_shortcut = true;

-- RLS Policies
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON user_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON user_categories
  FOR ALL USING (auth.uid() = user_id);

-- 5. MESSAGES TABLE
-- Unified table for all message types
CREATE TABLE messages (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  
  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'preassistant')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'voice', 'checkin', 'feedback')),
  
  -- Coach reference for AI responses
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  
  -- Answer options for interactive messages
  answer_options JSONB,
  -- Format: { type: 'radio' | 'checkbox', options: string[] }
  
  -- Metadata (flexible JSON for different message types)
  metadata JSONB DEFAULT '{}',
  -- For check-ins: { type: 'start'|'message'|'end', summary: '', insight: '', brief: '', mood: {} }
  -- For voice: { transcription_id: '', audio_url: '' }
  -- For feedback: { type: 'user_feedback' }
  
  -- Token tracking
  tokens_used INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_category ON messages(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_messages_content_type ON messages(content_type);
CREATE INDEX idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_messages_coach ON messages(coach_id) WHERE coach_id IS NOT NULL;

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. CHECK_INS TABLE
-- Dedicated table for check-in sessions
CREATE TABLE check_ins (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Check-in status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'aborted')),
  
  -- Questions and answers
  questions JSONB NOT NULL DEFAULT '[]',
  -- Format: Array of { id, question, type, options, answer?, explanation? }
  
  -- AI-generated results
  summary TEXT,
  insight TEXT,
  brief TEXT,
  level INTEGER CHECK (level >= 0 AND level <= 100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_check_ins_user ON check_ins(user_id);
CREATE INDEX idx_check_ins_status ON check_ins(status);
CREATE INDEX idx_check_ins_category ON check_ins(category_id) WHERE category_id IS NOT NULL;

-- RLS Policies
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own check-ins" ON check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own check-ins" ON check_ins
  FOR ALL USING (auth.uid() = user_id);

-- 7. HEALTH CARDS TABLE (renamed from recommendations)
-- AI-generated health recommendations and insights
CREATE TABLE health_cards (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  checkin_id UUID REFERENCES check_ins(id) ON DELETE CASCADE,
  
  -- Card content
  type INTEGER NOT NULL CHECK (type IN (1, 2)),
  -- 1: Action recommendation
  -- 2: Category insight (can trigger check-ins)
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Importance and relevance
  importance INTEGER CHECK (importance >= 1 AND importance <= 10),
  
  -- Status
  is_checked BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_health_cards_user ON health_cards(user_id);
CREATE INDEX idx_health_cards_active ON health_cards(user_id, is_checked, expires_at) 
  WHERE is_checked = false;
CREATE INDEX idx_health_cards_category ON health_cards(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_health_cards_checkin ON health_cards(checkin_id) WHERE checkin_id IS NOT NULL;

-- RLS Policies
ALTER TABLE health_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health cards" ON health_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own health cards" ON health_cards
  FOR UPDATE USING (auth.uid() = user_id);

-- 8. RECOMMENDATIONS TABLE
-- Unified recommendations (keeping for compatibility)
CREATE TABLE recommendations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  checkin_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  parent_recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
  
  -- Recommendation content
  title TEXT,
  recommendation_text TEXT NOT NULL,
  action TEXT,
  why TEXT,
  
  -- Classification
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('action', 'category')),
  importance INTEGER CHECK (importance BETWEEN 1 AND 5),
  relevance NUMERIC(3,2) CHECK (relevance BETWEEN 0 AND 1),
  
  -- Additional data
  recommended_categories UUID[] DEFAULT '{}',
  context TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  viewed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recommendations_user ON recommendations(user_id);
CREATE INDEX idx_recommendations_type ON recommendations(recommendation_type);
CREATE INDEX idx_recommendations_parent ON recommendations(parent_recommendation_id) WHERE parent_recommendation_id IS NOT NULL;
CREATE INDEX idx_recommendations_active ON recommendations(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_recommendations_checkin ON recommendations(checkin_message_id) WHERE checkin_message_id IS NOT NULL;

-- RLS Policies
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" ON recommendations
  FOR UPDATE USING (auth.uid() = user_id);

-- 9. USER FEEDBACK TABLE
-- Store user feedback and ratings
CREATE TABLE user_feedback (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
  health_card_id UUID REFERENCES health_cards(id) ON DELETE CASCADE,
  
  -- Feedback content
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('rating', 'text', 'bug', 'suggestion')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  
  -- Context
  context JSONB DEFAULT '{}',
  
  -- Status
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_unprocessed ON user_feedback(is_processed) WHERE is_processed = false;

-- RLS Policies
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON user_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own feedback" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. APP VERSIONS TABLE
-- Track app versions and user updates
CREATE TABLE app_versions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Version info
  version_number TEXT NOT NULL UNIQUE,
  build_number INTEGER NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  
  -- Release info
  release_notes TEXT,
  minimum_supported BOOLEAN DEFAULT false,
  is_required_update BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  released_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_app_versions_platform ON app_versions(platform, is_active);
CREATE INDEX idx_app_versions_released ON app_versions(released_at DESC);

-- RLS Policies
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active versions" ON app_versions
  FOR SELECT USING (is_active = true);

-- 11. USER APP VERSIONS TABLE
-- Track which version each user is on
CREATE TABLE user_app_versions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES app_versions(id),
  
  -- Device info
  device_model TEXT,
  os_version TEXT,
  
  -- Timestamps
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  last_opened_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_app_versions_user ON user_app_versions(user_id);
CREATE INDEX idx_user_app_versions_version ON user_app_versions(version_id);

-- RLS Policies
ALTER TABLE user_app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own app versions" ON user_app_versions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own app versions" ON user_app_versions
  FOR ALL USING (auth.uid() = user_id);

-- 12. ANALYTICS EVENTS TABLE
-- Track user behavior and app usage
CREATE TABLE analytics_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,
  
  -- Event info
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_properties JSONB DEFAULT '{}',
  
  -- Context
  platform TEXT,
  app_version TEXT,
  device_info JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id) WHERE session_id IS NOT NULL;

-- Partitioning by month for better performance
-- Note: Uncomment when ready to implement partitioning
-- CREATE TABLE analytics_events_2025_01 PARTITION OF analytics_events
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- RLS Policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Analytics events can only be inserted, not viewed by users
CREATE POLICY "Users can create own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 13. APP CONFIG TABLE
-- Store app-wide configuration
CREATE TABLE app_config (
  -- Primary key
  key TEXT PRIMARY KEY,
  
  -- Configuration data
  value JSONB NOT NULL,
  description TEXT,
  
  -- Metadata
  is_public BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO app_config (key, value, description, is_public) VALUES
  ('default_coach', '{"default_coach_id": null}', 'Default coach for new users', false),
  ('shortcuts', '{"items": []}', 'Quick action shortcuts', true),
  ('ai_config', '{"model": "gpt-4", "temperature": 0.7}', 'AI model configuration', false),
  ('voice_config', '{"max_duration_seconds": 60, "formats": ["wav"]}', 'Voice recording configuration', true),
  ('checkin_config', '{"min_questions": 3, "max_questions": 10}', 'Check-in configuration', false);

-- RLS Policies
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public config" ON app_config
  FOR SELECT USING (is_public = true);

CREATE POLICY "Service role can manage all config" ON app_config
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- VIEWS

-- 1. User Check-ins View
CREATE VIEW user_checkins AS
SELECT 
  m.id,
  m.user_id,
  m.category_id,
  m.created_at,
  m.metadata->>'summary' as summary,
  m.metadata->>'insight' as insight,
  m.metadata->>'brief' as brief,
  m.metadata->'mood' as mood,
  c.name as category_name,
  uc.checkin_count
FROM messages m
JOIN categories c ON c.id = m.category_id
LEFT JOIN user_categories uc ON uc.user_id = m.user_id AND uc.category_id = m.category_id
WHERE m.content_type = 'checkin' 
  AND m.metadata->>'type' = 'end';

-- 2. User Stats View
CREATE VIEW user_stats AS
SELECT 
  u.id as user_id,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT m.id) FILTER (WHERE m.content_type = 'checkin') as total_checkins,
  COUNT(DISTINCT uc.category_id) as categories_used,
  COUNT(DISTINCT uc.category_id) FILTER (WHERE uc.is_favorite) as favorite_categories,
  COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'completed') as completed_checkins,
  COUNT(DISTINCT hc.id) FILTER (WHERE hc.is_checked = false AND hc.expires_at > NOW()) as active_cards,
  MAX(m.created_at) as last_activity
FROM auth.users u
LEFT JOIN messages m ON m.user_id = u.id
LEFT JOIN user_categories uc ON uc.user_id = u.id
LEFT JOIN check_ins ci ON ci.user_id = u.id
LEFT JOIN health_cards hc ON hc.user_id = u.id
GROUP BY u.id;

-- FUNCTIONS

-- 1. Handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_default_coach_id UUID;
BEGIN
  -- Get default coach from config or use Daniel, then any active coach
  SELECT COALESCE(
    (SELECT (value->>'default_coach_id')::UUID FROM app_config WHERE key = 'default_coach' AND value->>'default_coach_id' IS NOT NULL),
    (SELECT id FROM coaches WHERE is_active = true AND name = 'Daniel' LIMIT 1),
    (SELECT id FROM coaches WHERE is_active = true ORDER BY created_at LIMIT 1)
  ) INTO v_default_coach_id;
  
  -- Create user profile with default coach
  INSERT INTO public.user_profiles (id, coach_id)
  VALUES (new.id, v_default_coach_id)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers
CREATE TRIGGER update_coaches_updated_at BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_categories_updated_at BEFORE UPDATE ON user_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Complete check-in function
CREATE OR REPLACE FUNCTION complete_checkin(
  p_checkin_id UUID,
  p_summary TEXT,
  p_insight TEXT,
  p_brief TEXT,
  p_level INTEGER
) RETURNS UUID AS $$
DECLARE
  v_checkin check_ins;
BEGIN
  -- Get check-in
  SELECT * INTO v_checkin FROM check_ins WHERE id = p_checkin_id;
  
  IF v_checkin.id IS NULL THEN
    RAISE EXCEPTION 'Check-in not found';
  END IF;
  
  IF v_checkin.status != 'in_progress' THEN
    RAISE EXCEPTION 'Check-in is not in progress';
  END IF;
  
  -- Update check-in
  UPDATE check_ins SET
    status = 'completed',
    completed_at = NOW(),
    summary = p_summary,
    insight = p_insight,
    brief = p_brief,
    level = p_level
  WHERE id = p_checkin_id;
  
  -- Update user category stats
  INSERT INTO user_categories (user_id, category_id, last_checkin_at, checkin_count, progress)
  VALUES (v_checkin.user_id, v_checkin.category_id, NOW(), 1, p_level)
  ON CONFLICT (user_id, category_id) 
  DO UPDATE SET 
    last_checkin_at = NOW(),
    checkin_count = user_categories.checkin_count + 1,
    progress = p_level;
  
  RETURN p_checkin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get category tree
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
    -- Base case: root categories
    SELECT 
      c.id,
      c.parent_id,
      c.name,
      c.name_short,
      1 as level,
      ARRAY[c.name] as path
    FROM categories c
    WHERE (c.parent_id IS NULL OR c.parent_id = p_parent_id)
      AND c.is_active = true
    
    UNION ALL
    
    -- Recursive case
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

-- 5. Get user's active health cards
CREATE OR REPLACE FUNCTION get_active_health_cards(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  category_id UUID,
  category_name TEXT,
  type INTEGER,
  title TEXT,
  content TEXT,
  importance INTEGER,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hc.id,
    hc.category_id,
    c.name as category_name,
    hc.type,
    hc.title,
    hc.content,
    hc.importance,
    hc.created_at,
    hc.expires_at
  FROM health_cards hc
  LEFT JOIN categories c ON c.id = hc.category_id
  WHERE hc.user_id = p_user_id
    AND hc.is_checked = false
    AND (hc.expires_at IS NULL OR hc.expires_at > NOW())
  ORDER BY hc.importance DESC, hc.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;