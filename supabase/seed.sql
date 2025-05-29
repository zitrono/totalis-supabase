-- Seed data for Totalis
-- Last updated: 2025-05-29 (Authenticated-only version)

-- Insert default coaches
INSERT INTO coaches (name, bio, sex, is_active) VALUES
  ('Daniel', 'Your supportive wellness coach focused on holistic health and mindfulness.', 'male', true),
  ('Sarah', 'An empathetic guide specializing in mental health and emotional wellbeing.', 'female', true),
  ('Alex', 'A balanced coach who integrates physical and mental wellness strategies.', 'female', true)
ON CONFLICT DO NOTHING;

-- Insert app configuration
INSERT INTO app_config (key, value, description, is_public) VALUES
  ('default_coach', 
   (SELECT jsonb_build_object('default_coach_id', id::text) FROM coaches WHERE name = 'Daniel' LIMIT 1), 
   'Default coach for new users', 
   false),
  ('ai_config', 
   '{"model": "claude-3-sonnet", "temperature": 0.7, "max_tokens": 1000}'::jsonb, 
   'AI model configuration', 
   false),
  ('rate_limits', 
   '{"audio_transcriptions_per_minute": 10, "messages_per_hour": 100}'::jsonb, 
   'Rate limiting configuration', 
   false),
  ('features', 
   '{"voice_enabled": true, "checkins_enabled": true, "recommendations_enabled": true}'::jsonb, 
   'Feature flags', 
   true)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    updated_at = NOW();

-- Insert root categories
INSERT INTO categories (name, name_short, description, sort_order, is_active, checkin_enabled, primary_color, secondary_color) VALUES
  ('Physical Health', 'Physical', 'Focus on your body''s wellbeing through exercise, nutrition, and rest', 100, true, true, '#4CAF50', '#81C784'),
  ('Mental Health', 'Mental', 'Nurture your mind through mindfulness, stress management, and emotional balance', 200, true, true, '#2196F3', '#64B5F6'),
  ('Social Wellness', 'Social', 'Build meaningful relationships and community connections', 300, true, true, '#FF9800', '#FFB74D'),
  ('Personal Growth', 'Growth', 'Develop new skills and pursue your goals', 400, true, true, '#9C27B0', '#BA68C8')
ON CONFLICT DO NOTHING;

-- Insert subcategories
WITH parent_categories AS (
  SELECT id, name FROM categories WHERE parent_id IS NULL
)
INSERT INTO categories (parent_id, name, name_short, description, sort_order, is_active, checkin_enabled, primary_color, secondary_color) 
SELECT 
  p.id,
  c.name,
  c.name_short,
  c.description,
  c.sort_order,
  true,
  true,
  c.primary_color,
  c.secondary_color
FROM parent_categories p
CROSS JOIN (VALUES
  -- Physical Health subcategories
  ('Exercise', 'Exercise', 'Regular physical activity and fitness routines', 110, '#66BB6A', '#81C784'),
  ('Nutrition', 'Nutrition', 'Healthy eating habits and dietary choices', 120, '#43A047', '#66BB6A'),
  ('Sleep', 'Sleep', 'Quality rest and sleep hygiene', 130, '#388E3C', '#4CAF50'),
  
  -- Mental Health subcategories
  ('Mindfulness', 'Mindful', 'Present-moment awareness and meditation practices', 210, '#42A5F5', '#64B5F6'),
  ('Stress Management', 'Stress', 'Techniques for handling life''s pressures', 220, '#1E88E5', '#42A5F5'),
  ('Emotional Balance', 'Emotions', 'Understanding and managing your emotions', 230, '#1976D2', '#2196F3'),
  
  -- Social Wellness subcategories
  ('Relationships', 'Relations', 'Building and maintaining healthy relationships', 310, '#FFB74D', '#FFCC80'),
  ('Community', 'Community', 'Engaging with your local and online communities', 320, '#FF9800', '#FFB74D'),
  ('Communication', 'Comm', 'Effective interpersonal communication skills', 330, '#F57C00', '#FF9800'),
  
  -- Personal Growth subcategories
  ('Learning', 'Learning', 'Continuous education and skill development', 410, '#BA68C8', '#CE93D8'),
  ('Career', 'Career', 'Professional development and work-life balance', 420, '#9C27B0', '#BA68C8'),
  ('Creativity', 'Creative', 'Expressing yourself through creative pursuits', 430, '#8E24AA', '#AB47BC')
) AS c(name, name_short, description, sort_order, primary_color, secondary_color)
WHERE 
  (p.name = 'Physical Health' AND c.name IN ('Exercise', 'Nutrition', 'Sleep')) OR
  (p.name = 'Mental Health' AND c.name IN ('Mindfulness', 'Stress Management', 'Emotional Balance')) OR
  (p.name = 'Social Wellness' AND c.name IN ('Relationships', 'Community', 'Communication')) OR
  (p.name = 'Personal Growth' AND c.name IN ('Learning', 'Career', 'Creativity'))
ON CONFLICT DO NOTHING;

-- For testing in preview branches, we'll use a different approach
-- Test users will be created via a special migration that only runs in test environments
-- See: migrations/*_test_users_preview_only.sql

-- Log seed completion
INSERT INTO system_logs (log_level, component, message, metadata) VALUES
  ('info', 'seed', 'Seed data applied successfully', jsonb_build_object(
    'timestamp', NOW(),
    'coaches_count', (SELECT COUNT(*) FROM coaches),
    'categories_count', (SELECT COUNT(*) FROM categories),
    'environment', current_setting('app.environment', true)
  ));