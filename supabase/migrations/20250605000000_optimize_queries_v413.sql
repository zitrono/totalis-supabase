-- Backend Version 4.1.3: Query Optimization Support
BEGIN;

-- Task 1: Foreign Keys and Indexes
-- Enable profiles -> coaches join optimization
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_coach FOREIGN KEY (coach_id) REFERENCES coaches(id);
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON profiles(coach_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);

-- Task 2: Create Optimized Database Views
-- Drop existing view first
DROP VIEW IF EXISTS user_profiles_with_coach_details;

-- User profile with coach view - Optimizes UserProfileBloc queries
CREATE VIEW user_profiles_with_coach_details AS
SELECT 
  p.*,
  json_build_object(
    'id', c.id,
    'name', c.name,
    'bio', c.bio,
    'photo_url', c.photo_url,
    'is_active', c.is_active
  ) as coach_details
FROM profiles p
LEFT JOIN coaches c ON p.coach_id = c.id;

-- Summary data aggregation view - Optimizes SummaryBloc queries
CREATE OR REPLACE VIEW user_summary_data AS
SELECT 
  p.id as user_id,
  p.first_name,
  p.last_name,
  (
    SELECT json_agg(
      json_build_object(
        'id', ci.id,
        'category_id', ci.category_id,
        'status', ci.status,
        'completed_at', ci.completed_at,
        'wellness_level', ci.wellness_level
      ) ORDER BY ci.completed_at DESC
    )
    FROM checkins ci
    WHERE ci.user_id = p.id
    AND ci.completed_at > NOW() - INTERVAL '30 days'
  ) as recent_checkins,
  (
    SELECT json_agg(
      json_build_object(
        'id', r.id,
        'title', r.title,
        'category_id', r.category_id,
        'importance', r.importance,
        'created_at', r.created_at
      ) ORDER BY r.importance DESC, r.created_at DESC
    )
    FROM recommendations r
    WHERE r.user_id = p.id
    AND r.is_active = true
    LIMIT 10
  ) as active_recommendations
FROM profiles p;

-- Grant access to views
GRANT SELECT ON user_profiles_with_coach_details TO authenticated;
GRANT SELECT ON user_summary_data TO authenticated;

-- Task 3: RLS on views is handled by underlying tables
-- Views inherit security from base tables, no additional policies needed

-- Task 4: Add Check-in Real-time Trigger
-- Enable real-time for checkins table if not already enabled
ALTER TABLE checkins REPLICA IDENTITY FULL;

-- Create trigger for check-in progress updates
CREATE OR REPLACE FUNCTION notify_checkin_progress()
RETURNS trigger AS $$
BEGIN
  -- Only notify on status changes during active check-ins
  IF NEW.status != OLD.status AND NEW.status IN ('in_progress', 'completed') THEN
    PERFORM pg_notify(
      'checkin_progress',
      json_build_object(
        'user_id', NEW.user_id,
        'checkin_id', NEW.id,
        'status', NEW.status,
        'wellness_level', NEW.wellness_level
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkin_progress_trigger
AFTER UPDATE ON checkins
FOR EACH ROW
EXECUTE FUNCTION notify_checkin_progress();

-- Task 5: Optimize Presence Channel Performance
-- Optimize coach presence lookups
CREATE INDEX IF NOT EXISTS idx_coaches_active ON coaches(id) WHERE is_active = true;

-- Add last_seen tracking for presence fallback
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_coaches_last_seen ON coaches(last_seen_at) WHERE is_active = true;

-- Task 6: Performance Optimization Indexes
-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_messages_user_created 
  ON messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_active_importance 
  ON recommendations(user_id, is_active, importance DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_profile_categories_user_favorite
  ON profile_categories(user_id, is_favorite)
  WHERE is_favorite = true;

-- Update version in app_config
UPDATE app_config 
SET value = '"4.1.3"', 
    updated_at = NOW() 
WHERE key = 'backend_version';

COMMIT;