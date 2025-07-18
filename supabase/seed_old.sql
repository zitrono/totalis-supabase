-- Seed data for Totalis
-- Last updated: 2025-05-29 (testing schema generation)

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

-- Create test users for preview environments
-- These users will only exist in preview branches, not in production
DO $$
DECLARE
  test_user_id UUID;
  default_coach_id UUID;
  existing_user_id UUID;
BEGIN
  -- Temporarily disable the trigger that creates profiles automatically
  ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
  
  -- Get default coach ID
  SELECT id INTO default_coach_id FROM coaches WHERE name = 'Daniel' LIMIT 1;
  
  -- Create test users
  FOR i IN 1..5 LOOP
    -- Check if user already exists
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE email = 'test' || i || '@totalis.app';
    
    IF existing_user_id IS NULL THEN
      test_user_id := gen_random_uuid();
      
      -- Insert user into auth.users
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        test_user_id,
        'authenticated',
        'authenticated',
        'test' || i || '@totalis.app',
        crypt('Test123!@#', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"test_account":true}',
        NOW(),
        NOW()
      );
      
      -- Create identity for the user (required for auth to work properly)
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
        'test' || i || '@totalis.app',  -- provider_id should be the email for email provider
        test_user_id,
        jsonb_build_object(
          'sub', test_user_id::text,
          'email', 'test' || i || '@totalis.app',
          'email_verified', true,
          'provider', 'email'
        ),
        'email',
        NOW(),
        NOW(),
        NOW()
      );
      
      -- Create profile for the user
      INSERT INTO public.profiles (
        id,
        coach_id,
        metadata
      ) VALUES (
        test_user_id,
        default_coach_id,
        jsonb_build_object(
          'test_account', true,
          'permanent', true,
          'created_at', NOW()
        )
      );
    ELSE
      -- User exists, make sure profile exists too
      INSERT INTO public.profiles (
        id,
        coach_id,
        metadata
      ) 
      SELECT 
        existing_user_id,
        default_coach_id,
        jsonb_build_object(
          'test_account', true,
          'permanent', true,
          'created_at', NOW()
        )
      WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = existing_user_id
      );
    END IF;
  END LOOP;
  
  -- Re-enable the trigger
  ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
END $$;

-- Grant necessary permissions for anonymous users
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON coaches, categories, app_config TO anon;