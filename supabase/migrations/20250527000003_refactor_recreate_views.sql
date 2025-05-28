-- Drop existing views if they exist
DROP VIEW IF EXISTS messages_with_coach CASCADE;
DROP VIEW IF EXISTS checkin_history_view CASCADE;
DROP VIEW IF EXISTS active_recommendations CASCADE;
DROP VIEW IF EXISTS categories_with_user_preferences CASCADE;
DROP VIEW IF EXISTS user_profiles_with_coaches CASCADE;

-- Create views for simplified mobile SDK queries

-- User profile with coach details
CREATE OR REPLACE VIEW user_profiles_with_coaches AS
SELECT 
  p.*,
  c.name as coach_name,
  c.photo_url as coach_avatar,
  c.bio as coach_bio,
  c.sex as coach_sex,
  c.year_of_birth as coach_year_of_birth
FROM profiles p
LEFT JOIN coaches c ON p.coach_id = c.id;

-- Categories with user preferences (user-specific via RLS)
CREATE OR REPLACE VIEW categories_with_user_preferences AS
SELECT 
  c.*,
  pc.user_id,
  pc.is_favorite,
  pc.created_at as added_at,
  CASE WHEN pc.user_id IS NOT NULL THEN true ELSE false END as is_selected
FROM categories c
LEFT JOIN profile_categories pc ON c.id = pc.category_id;

-- Active recommendations with category info
CREATE OR REPLACE VIEW active_recommendations AS
SELECT 
  r.*,
  c.name as category_name,
  c.icon as category_icon,
  c.primary_color as category_color
FROM recommendations r
JOIN categories c ON r.category_id = c.id
WHERE r.is_active = true;

-- Check-in history with details (simplified without recommendation count)
CREATE OR REPLACE VIEW checkin_history_view AS
SELECT 
  ch.*,
  c.name as category_name,
  c.primary_color as category_color,
  c.icon as category_icon
FROM checkins ch
JOIN categories c ON ch.category_id = c.id
WHERE ch.status = 'completed';

-- Messages with coach info for display
CREATE OR REPLACE VIEW messages_with_coach AS
SELECT 
  m.*,
  CASE 
    WHEN m.role = 'assistant' THEN c.name
    ELSE p.name
  END as sender_name,
  CASE 
    WHEN m.role = 'assistant' THEN c.photo_url
    ELSE NULL
  END as sender_avatar
FROM messages m
JOIN profiles p ON m.user_id = p.id
LEFT JOIN coaches c ON m.coach_id = c.id;

-- Grant access to views
GRANT SELECT ON user_profiles_with_coaches TO anon, authenticated;
GRANT SELECT ON categories_with_user_preferences TO anon, authenticated;
GRANT SELECT ON active_recommendations TO anon, authenticated;
GRANT SELECT ON checkin_history_view TO anon, authenticated;
GRANT SELECT ON messages_with_coach TO anon, authenticated;

-- Enable security invoker on views to inherit RLS from base tables
ALTER VIEW user_profiles_with_coaches SET (security_invoker = true);
ALTER VIEW categories_with_user_preferences SET (security_invoker = true);
ALTER VIEW active_recommendations SET (security_invoker = true);
ALTER VIEW checkin_history_view SET (security_invoker = true);
ALTER VIEW messages_with_coach SET (security_invoker = true);

-- Note: Views inherit RLS policies from their base tables when security_invoker is true
-- No need to create separate policies on views