-- Seed data for Totalis
-- Last updated: 2025-06-03 (Preview-first architecture with deterministic test users)

-- CRITICAL: Create test users FIRST to ensure they exist before migrations reference them
-- These deterministic UUIDs are used throughout the test suite
DO $$
DECLARE
  test_users RECORD;
BEGIN
  -- Define test users with deterministic UUIDs
  FOR test_users IN 
    SELECT * FROM (VALUES
      ('11111111-1111-1111-1111-111111111111'::uuid, 'test1@totalis.app', 'Test123!@#'),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'test2@totalis.app', 'Test123!@#'),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'test3@totalis.app', 'Test123!@#')
    ) AS t(id, email, password)
  LOOP
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      test_users.id,
      'authenticated',
      'authenticated',
      test_users.email,
      crypt(test_users.password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('email', test_users.email),
      false
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      test_users.id::text,
      test_users.id,
      jsonb_build_object(
        'sub', test_users.id::text,
        'email', test_users.email,
        'email_verified', true,
        'provider', 'email'
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT (provider_id, provider) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Test users created/verified in auth schema';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'Cannot create test users in auth schema - this is expected in preview branches';
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating test users: %', SQLERRM;
END $$;

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
   true),
  ('quick_prompts', 
   '[
     {"id": "1", "text": "What should I focus on today?", "category": "general"},
     {"id": "2", "text": "How can I reduce stress?", "category": "mental"},
     {"id": "3", "text": "What healthy habits should I build?", "category": "physical"},
     {"id": "4", "text": "How can I improve my relationships?", "category": "social"}
   ]'::jsonb,
   'Quick prompt suggestions for users',
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

-- Create profiles for test users if they exist
-- This ensures profiles exist even if the auth trigger didn't fire
INSERT INTO profiles (id, coach_id, year_of_birth, sex)
SELECT 
  u.id,
  (SELECT id FROM coaches WHERE name = 'Daniel' LIMIT 1),
  CASE 
    WHEN u.email = 'test1@totalis.app' THEN 1990
    WHEN u.email = 'test2@totalis.app' THEN 1985
    WHEN u.email = 'test3@totalis.app' THEN 1995
  END,
  CASE 
    WHEN u.email = 'test1@totalis.app' THEN 'male'
    WHEN u.email = 'test2@totalis.app' THEN 'female'
    WHEN u.email = 'test3@totalis.app' THEN 'male'
  END
FROM auth.users u
WHERE u.email IN ('test1@totalis.app', 'test2@totalis.app', 'test3@totalis.app')
ON CONFLICT (id) DO UPDATE 
SET coach_id = EXCLUDED.coach_id
WHERE profiles.coach_id IS NULL;

-- Create some categories for test users
INSERT INTO profile_categories (user_id, category_id)
SELECT 
  p.id,
  c.id
FROM profiles p
CROSS JOIN categories c
WHERE p.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
)
AND c.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Create initial recommendations for test users
INSERT INTO recommendations (
  user_id,
  category_id,
  coach_id,
  title,
  content,
  recommendation_type,
  priority,
  status
)
SELECT 
  p.id,
  c.id,
  p.coach_id,
  'Welcome to ' || c.name,
  'Let''s explore ways to improve your ' || LOWER(c.name) || '. This is your starting point for a healthier, happier you.',
  'initial',
  CASE 
    WHEN c.name = 'Physical Health' THEN 1
    WHEN c.name = 'Mental Health' THEN 2
    ELSE 3
  END,
  'active'
FROM profiles p
CROSS JOIN categories c
WHERE p.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
)
AND c.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Log seed completion with diagnostic info
INSERT INTO system_logs (log_level, component, message, metadata) VALUES
  ('info', 'seed', 'Seed data applied successfully', jsonb_build_object(
    'timestamp', NOW(),
    'coaches_count', (SELECT COUNT(*) FROM coaches),
    'categories_count', (SELECT COUNT(*) FROM categories),
    'profiles_count', (SELECT COUNT(*) FROM profiles),
    'test_users_count', (SELECT COUNT(*) FROM auth.users WHERE email LIKE 'test%@totalis.app'),
    'environment', current_setting('app.environment', true),
    'database', current_database()
  ));