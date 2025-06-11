-- Migration: Add optimized views and tables for direct database access
-- Based on api-to-database-migration-analysis.md

-- =====================================================
-- 1. Create app_config table for configuration variables
-- =====================================================
CREATE TABLE IF NOT EXISTS app_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Read-only access for authenticated users
CREATE POLICY "Users can read app config" ON app_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 2. Create analytics_events table for event logging
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_data JSONB,
  platform TEXT,
  app_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Add RLS policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own events
CREATE POLICY "Users can insert their own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own events
CREATE POLICY "Users can read their own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 3. Create feedback table for user feedback
-- =====================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  feedback_type TEXT CHECK (feedback_type IN ('bug', 'feature', 'general')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  response TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_status ON feedback(status);

-- Add RLS policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users can read their own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 4. Create user_categories_with_details view
-- =====================================================
CREATE OR REPLACE VIEW user_categories_with_details AS
SELECT 
  uc.user_id,
  uc.category_id,
  uc.is_favorite,
  uc.is_subscribed,
  uc.last_interaction_at AS last_engaged_at,
  uc.created_at,
  uc.updated_at,
  c.name AS category_name,
  c.name_short AS category_name_short,
  c.description AS category_description,
  c.icon AS category_icon,
  c.primary_color AS category_color,
  c.parent_id AS category_parent_id,
  COUNT(DISTINCT ch.id) AS checkin_count,
  MAX(ch.created_at) AS last_checkin_at,
  AVG(ch.wellness_level) AS average_wellness_level
FROM user_categories uc
INNER JOIN categories c ON uc.category_id = c.id
LEFT JOIN checkins ch ON ch.user_id = uc.user_id 
  AND ch.category_id = uc.category_id
  AND ch.completed_at IS NOT NULL
GROUP BY uc.user_id, uc.category_id, uc.is_favorite, uc.is_subscribed, 
         uc.last_interaction_at, uc.created_at, uc.updated_at,
         c.id, c.name, c.name_short, c.description, c.icon, c.primary_color, c.parent_id;

-- Grant permissions
GRANT SELECT ON user_categories_with_details TO authenticated;

-- =====================================================
-- 5. Create user_checkins_summary view
-- =====================================================
CREATE OR REPLACE VIEW user_checkins_summary AS
SELECT 
  ch.id,
  ch.user_id,
  ch.category_id,
  ch.status,
  ch.wellness_level AS level,
  ch.summary,
  ch.insight,
  ch.completed_at,
  ch.created_at,
  ch.updated_at,
  c.name AS category_name,
  c.icon AS category_icon,
  c.primary_color AS category_color,
  COUNT(DISTINCT m.id) AS message_count,
  MAX(m.created_at) AS last_message_at,
  -- Calculate duration if completed
  CASE 
    WHEN ch.completed_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (ch.completed_at - ch.created_at))::INTEGER
    ELSE NULL
  END AS duration_seconds
FROM checkins ch
INNER JOIN categories c ON ch.category_id = c.id
LEFT JOIN messages m ON m.ref_checkin_id = ch.id
GROUP BY ch.id, c.id;

-- Grant permissions
GRANT SELECT ON user_checkins_summary TO authenticated;

-- =====================================================
-- 6. Create active_recommendations_with_details view
-- =====================================================
CREATE OR REPLACE VIEW active_recommendations_with_details AS
SELECT 
  r.id,
  r.user_id,
  r.category_id,
  r.checkin_message_id,
  r.parent_recommendation_id,
  r.title,
  r.recommendation_text,
  r.action,
  r.why,
  r.recommendation_type,
  r.importance,
  r.relevance,
  r.recommended_categories,
  r.context,
  r.is_active,
  r.viewed_at,
  r.dismissed_at,
  r.created_at,
  r.metadata,
  c.name AS category_name,
  c.icon AS category_icon,
  c.primary_color AS category_color,
  ch.created_at AS checkin_date,
  -- Calculate expiration (196 hours from creation)
  r.created_at + INTERVAL '196 hours' AS expires_at,
  -- Check if expired
  CASE 
    WHEN r.created_at + INTERVAL '196 hours' < NOW() THEN true
    ELSE false
  END AS is_expired
FROM recommendations r
INNER JOIN categories c ON r.category_id = c.id
LEFT JOIN messages m ON r.checkin_message_id = m.id
LEFT JOIN checkins ch ON m.ref_checkin_id = ch.id
WHERE r.is_active = true
  AND r.dismissed_at IS NULL
  AND r.created_at + INTERVAL '196 hours' > NOW(); -- Only non-expired

-- Grant permissions
GRANT SELECT ON active_recommendations_with_details TO authenticated;

-- =====================================================
-- 7. Create messages_with_context view for chat
-- =====================================================
CREATE OR REPLACE VIEW messages_with_context AS
SELECT 
  m.id,
  m.user_id,
  m.coach_id,
  m.ref_checkin_id,
  m.role,
  m.content,
  m.metadata,
  m.created_at,
  p.email AS user_email,
  p.name AS user_name,
  co.name AS coach_name,
  co.image_url AS coach_avatar,
  ch.category_id AS checkin_category_id,
  cat.name AS checkin_category_name
FROM messages m
LEFT JOIN profiles p ON m.user_id = p.id
LEFT JOIN coaches co ON m.coach_id = co.id
LEFT JOIN checkins ch ON m.ref_checkin_id = ch.id
LEFT JOIN categories cat ON ch.category_id = cat.id
WHERE m.content_type = 'text' AND m.ref_checkin_id IS NULL; -- Only chat messages, not checkin messages

-- Grant permissions
GRANT SELECT ON messages_with_context TO authenticated;

-- =====================================================
-- 8. Create user_profile_summary view (aggregate stats)
-- =====================================================
CREATE OR REPLACE VIEW user_profile_summary AS
SELECT 
  p.id AS user_id,
  p.email,
  p.name,
  p.first_name,
  p.last_name,
  p.birth_date,
  p.sex,
  p.coach_id,
  p.avatar_url,
  co.name AS coach_name,
  COUNT(DISTINCT ch.id) AS total_checkins,
  COUNT(DISTINCT CASE WHEN ch.completed_at IS NOT NULL THEN ch.id END) AS completed_checkins,
  COUNT(DISTINCT uc.category_id) AS total_categories,
  COUNT(DISTINCT CASE WHEN uc.is_favorite THEN uc.category_id END) AS favorite_categories,
  COUNT(DISTINCT r.id) AS total_recommendations,
  COUNT(DISTINCT CASE WHEN r.viewed_at IS NOT NULL THEN r.id END) AS viewed_recommendations,
  MAX(ch.created_at) AS last_checkin_at,
  MAX(m.created_at) AS last_message_at
FROM profiles p
LEFT JOIN coaches co ON p.coach_id = co.id
LEFT JOIN user_categories uc ON uc.user_id = p.id
LEFT JOIN checkins ch ON ch.user_id = p.id
LEFT JOIN recommendations r ON r.user_id = p.id AND r.is_active = true
LEFT JOIN messages m ON m.user_id = p.id AND m.message_type = 'chat'
GROUP BY p.id, co.id;

-- Grant permissions
GRANT SELECT ON user_profile_summary TO authenticated;

-- =====================================================
-- 9. Add triggers for updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to new tables
DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feedback_updated_at ON feedback;
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. Insert default app config values
-- =====================================================
INSERT INTO app_config (key, value, description) VALUES
  ('shortcuts', '{"enabled": true, "items": []}', 'App shortcuts configuration'),
  ('recommendation_shelf_life_hours', '196', 'Default hours before recommendations expire'),
  ('max_checkin_questions', '10', 'Maximum questions per check-in')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE app_config IS 'Application configuration variables accessible to all authenticated users';
COMMENT ON TABLE analytics_events IS 'User analytics events for tracking app usage and behavior';
COMMENT ON TABLE feedback IS 'User feedback messages for app improvements and bug reports';
COMMENT ON VIEW user_categories_with_details IS 'User categories enriched with category details and check-in statistics';
COMMENT ON VIEW user_checkins_summary IS 'Check-ins with category info and message counts for dashboard display';
COMMENT ON VIEW active_recommendations_with_details IS 'Active recommendations with category details and expiration status';
COMMENT ON VIEW messages_with_context IS 'Chat messages with user, coach, and check-in context for rich display';
COMMENT ON VIEW user_profile_summary IS 'User profile with aggregated statistics for profile pages';