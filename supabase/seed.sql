-- Seed data for Totalis

-- Insert default coaches
INSERT INTO coaches (name, bio, sex, is_active) VALUES
  ('Daniel', 'Your supportive wellness coach focused on holistic health and mindfulness.', 'male', true),
  ('Sarah', 'An empathetic guide specializing in mental health and emotional wellbeing.', 'female', true),
  ('Alex', 'A balanced coach who integrates physical and mental wellness strategies.', 'non_binary', true)
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
  ('Physical Health', 'Exercise', 'Exercise', 'Regular physical activity and fitness', 110, '#66BB6A', '#81C784'),
  ('Physical Health', 'Nutrition', 'Nutrition', 'Healthy eating habits and dietary choices', 120, '#8BC34A', '#AED581'),
  ('Physical Health', 'Sleep', 'Sleep', 'Quality rest and sleep hygiene', 130, '#689F38', '#9CCC65'),
  
  -- Mental Health subcategories
  ('Mental Health', 'Mindfulness', 'Mindfulness', 'Present-moment awareness and meditation', 210, '#42A5F5', '#64B5F6'),
  ('Mental Health', 'Stress Management', 'Stress', 'Techniques for managing stress and anxiety', 220, '#1E88E5', '#42A5F5'),
  ('Mental Health', 'Emotional Balance', 'Emotions', 'Understanding and regulating emotions', 230, '#1976D2', '#2196F3'),
  
  -- Social Wellness subcategories
  ('Social Wellness', 'Relationships', 'Relations', 'Building healthy relationships', 310, '#FFA726', '#FFB74D'),
  ('Social Wellness', 'Communication', 'Communicate', 'Effective communication skills', 320, '#FF9800', '#FFA726'),
  ('Social Wellness', 'Community', 'Community', 'Engaging with your community', 330, '#F57C00', '#FF9800'),
  
  -- Personal Growth subcategories
  ('Personal Growth', 'Learning', 'Learning', 'Continuous learning and education', 410, '#AB47BC', '#BA68C8'),
  ('Personal Growth', 'Productivity', 'Productive', 'Time management and efficiency', 420, '#9C27B0', '#AB47BC'),
  ('Personal Growth', 'Creativity', 'Creative', 'Expressing yourself creatively', 430, '#8E24AA', '#9C27B0')
) AS c(parent_name, name, name_short, description, sort_order, primary_color, secondary_color)
WHERE p.name = c.parent_name
ON CONFLICT DO NOTHING;

-- Grant necessary permissions for anonymous users
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON coaches, categories, app_config TO anon;-- CI/CD test comment
