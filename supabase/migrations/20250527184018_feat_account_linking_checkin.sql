-- Phase 2: Account Linking & Check-in System
-- ==========================================

-- 1. Account Merge Support
-- Function to merge anonymous account data into authenticated account
CREATE OR REPLACE FUNCTION merge_anonymous_account(
  anonymous_user_id UUID,
  authenticated_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate inputs
  IF anonymous_user_id = authenticated_user_id THEN
    RAISE EXCEPTION 'Cannot merge account with itself';
  END IF;
  
  -- Transfer messages
  UPDATE messages 
  SET user_id = authenticated_user_id 
  WHERE user_id = anonymous_user_id;
  
  -- Transfer checkins
  UPDATE checkins 
  SET user_id = authenticated_user_id 
  WHERE user_id = anonymous_user_id;
  
  -- Transfer recommendations
  UPDATE recommendations 
  SET user_id = authenticated_user_id 
  WHERE user_id = anonymous_user_id;
  
  -- Transfer user categories (merge settings if exists)
  INSERT INTO user_categories (user_id, category_id, settings, created_at)
  SELECT 
    authenticated_user_id,
    category_id,
    settings,
    created_at
  FROM user_categories
  WHERE user_id = anonymous_user_id
  ON CONFLICT (user_id, category_id) DO UPDATE
  SET settings = user_categories.settings || EXCLUDED.settings;
  
  -- Delete anonymous user categories after merge
  DELETE FROM user_categories WHERE user_id = anonymous_user_id;
  
  -- Transfer profile data (keep authenticated profile)
  UPDATE profiles
  SET metadata = COALESCE(profiles.metadata, '{}'::jsonb) || 
                 COALESCE((SELECT metadata FROM profiles WHERE id = anonymous_user_id), '{}'::jsonb)
  WHERE id = authenticated_user_id;
  
  -- Log the merge for audit
  INSERT INTO auth.audit_log_entries (
    instance_id,
    id,
    payload,
    created_at,
    ip_address
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    jsonb_build_object(
      'action', 'account_merge',
      'anonymous_user_id', anonymous_user_id,
      'authenticated_user_id', authenticated_user_id,
      'merged_at', now()
    ),
    now(),
    '0.0.0.0'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION merge_anonymous_account(UUID, UUID) TO authenticated;

-- 2. Check-in Progress Functions
-- Get active check-in for a user and category
CREATE OR REPLACE FUNCTION get_active_checkin(
  user_id_param UUID,
  category_id_param UUID
)
RETURNS TABLE (
  checkin_id UUID,
  current_question_index INT,
  answers JSONB,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.checkin_id,
    cp.current_question_index,
    cp.answers,
    cp.status,
    cp.created_at
  FROM checkin_progress cp
  JOIN checkins c ON c.id = cp.checkin_id
  WHERE cp.user_id = user_id_param
    AND c.category_id = category_id_param
    AND cp.status = 'in_progress'
  ORDER BY cp.created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_checkin(UUID, UUID) TO authenticated;

-- 3. Update check-in edge function response type
-- Add type definition for better integration
CREATE OR REPLACE FUNCTION save_checkin_progress(
  checkin_id_param UUID,
  question_index_param INT,
  answers_param JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO checkin_progress (
    user_id,
    checkin_id,
    current_question_index,
    answers,
    updated_at
  ) VALUES (
    auth.uid(),
    checkin_id_param,
    question_index_param,
    answers_param,
    NOW()
  )
  ON CONFLICT (user_id, checkin_id) DO UPDATE
  SET 
    current_question_index = EXCLUDED.current_question_index,
    answers = EXCLUDED.answers,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION save_checkin_progress(UUID, INT, JSONB) TO authenticated;

-- 4. Function to resume or create checkin
CREATE OR REPLACE FUNCTION resume_or_create_checkin(
  category_id_param UUID,
  coach_id_param UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_checkin RECORD;
  new_checkin_id UUID;
  template_questions JSONB;
BEGIN
  -- Check for existing in-progress checkin
  SELECT 
    c.id,
    cp.current_question_index,
    cp.answers,
    c.metadata->'template_questions' as questions
  INTO existing_checkin
  FROM checkins c
  LEFT JOIN checkin_progress cp ON cp.checkin_id = c.id AND cp.user_id = auth.uid()
  WHERE c.user_id = auth.uid()
    AND c.category_id = category_id_param
    AND c.status = 'in_progress'
  ORDER BY c.created_at DESC
  LIMIT 1;
  
  IF existing_checkin.id IS NOT NULL THEN
    -- Return existing checkin info
    RETURN jsonb_build_object(
      'checkin_id', existing_checkin.id,
      'resumed', true,
      'current_question_index', COALESCE(existing_checkin.current_question_index, 0),
      'answers', COALESCE(existing_checkin.answers, '[]'::jsonb),
      'questions', existing_checkin.questions
    );
  END IF;
  
  -- Get template questions
  SELECT questions INTO template_questions
  FROM checkin_templates
  WHERE category_id = category_id_param
    AND is_active = true
  LIMIT 1;
  
  IF template_questions IS NULL THEN
    RAISE EXCEPTION 'No active template found for category %', category_id_param;
  END IF;
  
  -- Create new checkin
  INSERT INTO checkins (
    user_id,
    category_id,
    coach_id,
    status,
    metadata
  ) VALUES (
    auth.uid(),
    category_id_param,
    COALESCE(coach_id_param, (
      SELECT settings->>'selected_coach_id'
      FROM user_categories
      WHERE user_id = auth.uid() AND category_id = category_id_param
    ))::UUID,
    'in_progress',
    jsonb_build_object(
      'template_questions', template_questions,
      'start_source', 'mobile_app'
    )
  ) RETURNING id INTO new_checkin_id;
  
  -- Create progress record
  INSERT INTO checkin_progress (
    user_id,
    checkin_id,
    current_question_index,
    answers
  ) VALUES (
    auth.uid(),
    new_checkin_id,
    0,
    '[]'::jsonb
  );
  
  RETURN jsonb_build_object(
    'checkin_id', new_checkin_id,
    'resumed', false,
    'current_question_index', 0,
    'answers', '[]'::jsonb,
    'questions', template_questions
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION resume_or_create_checkin(UUID, UUID) TO authenticated;

-- 5. Add index for better performance on account merge
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);