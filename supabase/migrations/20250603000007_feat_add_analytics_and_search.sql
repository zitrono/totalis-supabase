-- Add full-text search and analytics functions (v4.2.19)

-- Add text search configuration for messages
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS content_search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_messages_search 
  ON messages USING gin(content_search_vector);

-- Add search function
CREATE OR REPLACE FUNCTION search_messages(
  user_id_param UUID,
  search_query TEXT
)
RETURNS SETOF messages AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM messages
  WHERE user_id = user_id_param
    AND content_search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User check-in statistics
CREATE OR REPLACE FUNCTION get_user_checkin_stats(
  user_id_param UUID,
  period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_checkins INTEGER,
  categories_covered INTEGER,
  average_score NUMERIC,
  last_checkin TIMESTAMPTZ,
  streak_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_checkins,
    COUNT(DISTINCT category_id)::INTEGER as categories_covered,
    AVG(wellness_level)::NUMERIC as average_score,
    MAX(created_at) as last_checkin,
    -- Calculate streak (simplified)
    COUNT(DISTINCT DATE(created_at))::INTEGER as streak_days
  FROM checkins
  WHERE user_id = user_id_param
    AND created_at >= NOW() - INTERVAL '1 day' * period_days
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user dashboard view
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
  p.id,
  p.user_id,
  p.first_name,
  p.last_name,
  p.email,
  c.name as coach_name,
  c.id as coach_id,
  COUNT(DISTINCT ch.id) as total_checkins,
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT pc.category_id) as categories_selected,
  MAX(ch.created_at) as last_checkin,
  p.created_at as member_since
FROM profiles p
LEFT JOIN coaches c ON p.coach_id = c.id
LEFT JOIN checkins ch ON ch.user_id = p.user_id
LEFT JOIN recommendations r ON r.user_id = p.user_id
LEFT JOIN profile_categories pc ON pc.user_id = p.user_id
GROUP BY p.id, p.user_id, p.first_name, p.last_name, p.email, c.name, c.id, p.created_at;

-- Grant access
GRANT SELECT ON user_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION search_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_checkin_stats TO authenticated;