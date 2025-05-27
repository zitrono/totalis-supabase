-- Phase 4: Web Compatibility & Test Coverage

-- Create test data management functions
CREATE OR REPLACE FUNCTION create_test_user(
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT 'Test User'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  -- Generate test email if not provided
  v_email := COALESCE(p_email, 'test-' || gen_random_uuid() || '@totalis.app');
  
  -- Create auth user (this is a mock - actual user creation happens via Supabase Auth)
  -- For testing, we'll create a user profile directly
  v_user_id := gen_random_uuid();
  
  -- Create user profile
  INSERT INTO profiles (
    user_id,
    name,
    email,
    yearOfBirth,
    sex,
    created_at,
    updated_at,
    metadata
  ) VALUES (
    v_user_id,
    p_name,
    v_email,
    1990,
    'non-binary',
    NOW(),
    NOW(),
    jsonb_build_object(
      'is_test_user', true,
      'created_by', 'create_test_user',
      'created_at', NOW()
    )
  );
  
  RETURN v_user_id;
END;
$$;

-- Create function to clean test data
CREATE OR REPLACE FUNCTION clean_test_data(
  p_older_than INTERVAL DEFAULT INTERVAL '1 day',
  p_dry_run BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_counts JSONB := '{}'::jsonb;
  v_count INT;
BEGIN
  v_cutoff := NOW() - p_older_than;
  
  -- Count test messages
  SELECT COUNT(*) INTO v_count
  FROM messages
  WHERE ((metadata->>'is_test')::boolean = true
    OR metadata->>'test_run_id' IS NOT NULL
    OR voice_url LIKE '%/test-%')
    AND created_at < v_cutoff;
  v_counts := jsonb_set(v_counts, '{messages}', to_jsonb(v_count));
  
  -- Count test users
  SELECT COUNT(*) INTO v_count
  FROM profiles
  WHERE (metadata->>'is_test_user')::boolean = true
    AND created_at < v_cutoff;
  v_counts := jsonb_set(v_counts, '{users}', to_jsonb(v_count));
  
  -- Count test checkins
  SELECT COUNT(*) INTO v_count
  FROM checkins
  WHERE (metadata->>'is_test')::boolean = true
    AND created_at < v_cutoff;
  v_counts := jsonb_set(v_counts, '{checkins}', to_jsonb(v_count));
  
  -- Count test recommendations
  SELECT COUNT(*) INTO v_count
  FROM recommendations
  WHERE (metadata->>'is_test')::boolean = true
    AND created_at < v_cutoff;
  v_counts := jsonb_set(v_counts, '{recommendations}', to_jsonb(v_count));
  
  IF NOT p_dry_run THEN
    -- Delete test data
    DELETE FROM messages
    WHERE ((metadata->>'is_test')::boolean = true
      OR metadata->>'test_run_id' IS NOT NULL
      OR voice_url LIKE '%/test-%')
      AND created_at < v_cutoff;
    
    DELETE FROM recommendations
    WHERE (metadata->>'is_test')::boolean = true
      AND created_at < v_cutoff;
    
    DELETE FROM checkins
    WHERE (metadata->>'is_test')::boolean = true
      AND created_at < v_cutoff;
    
    -- Note: Be careful with user deletion as it cascades
    DELETE FROM profiles
    WHERE (metadata->>'is_test_user')::boolean = true
      AND created_at < v_cutoff;
  END IF;
  
  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'cutoff_date', v_cutoff,
    'counts', v_counts,
    'action', CASE WHEN p_dry_run THEN 'preview' ELSE 'deleted' END
  );
END;
$$;

-- Create function to generate test data
CREATE OR REPLACE FUNCTION generate_test_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_test_user_id UUID;
  v_test_coach_id UUID;
  v_test_category_id UUID;
  v_test_conversation_id UUID;
  v_test_run_id TEXT;
  v_result JSONB := '{}'::jsonb;
BEGIN
  -- Generate test run ID
  v_test_run_id := 'test-' || to_char(NOW(), 'YYYYMMDD-HH24MISS');
  
  -- Create test user
  v_test_user_id := create_test_user(
    'test-' || v_test_run_id || '@totalis.app',
    'Test User ' || v_test_run_id
  );
  
  -- Get a coach and category
  SELECT id INTO v_test_coach_id FROM coaches LIMIT 1;
  SELECT id INTO v_test_category_id FROM categories WHERE name = 'Anxiety' LIMIT 1;
  
  -- Create test conversation
  INSERT INTO conversations (id, user_id, category_id, created_at, updated_at, metadata)
  VALUES (
    gen_random_uuid(),
    v_test_user_id,
    v_test_category_id,
    NOW(),
    NOW(),
    jsonb_build_object(
      'is_test', true,
      'test_run_id', v_test_run_id
    )
  )
  RETURNING id INTO v_test_conversation_id;
  
  -- Create test messages
  INSERT INTO messages (conversation_id, user_id, message_text, message_type, metadata)
  VALUES 
    (v_test_conversation_id, v_test_user_id, 'Test message 1', 'text', 
     jsonb_build_object('is_test', true, 'test_run_id', v_test_run_id)),
    (v_test_conversation_id, v_test_coach_id, 'Test coach response', 'text',
     jsonb_build_object('is_test', true, 'test_run_id', v_test_run_id));
  
  -- Create test checkin
  INSERT INTO checkins (user_id, category_id, metadata)
  VALUES (
    v_test_user_id,
    v_test_category_id,
    jsonb_build_object(
      'is_test', true,
      'test_run_id', v_test_run_id
    )
  );
  
  -- Return created IDs
  RETURN jsonb_build_object(
    'test_run_id', v_test_run_id,
    'user_id', v_test_user_id,
    'conversation_id', v_test_conversation_id,
    'created_at', NOW()
  );
END;
$$;

-- Create function to validate web OAuth parameters
CREATE OR REPLACE FUNCTION validate_oauth_params(
  p_redirect_url TEXT,
  p_platform TEXT DEFAULT 'web'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allowed_urls TEXT[];
BEGIN
  -- Define allowed redirect URLs based on platform
  IF p_platform = 'web' THEN
    v_allowed_urls := ARRAY[
      'http://localhost:3000/auth/callback',
      'http://localhost:8080/auth/callback',
      'https://staging.totalis.app/auth/callback',
      'https://app.totalis.app/auth/callback'
    ];
  ELSE
    -- Mobile platforms
    v_allowed_urls := ARRAY[
      'io.supabase.totalis://login-callback',
      'com.totalis.app://login-callback'
    ];
  END IF;
  
  -- Check if redirect URL is allowed
  RETURN p_redirect_url = ANY(v_allowed_urls);
END;
$$;

-- Add indexes for test data queries
CREATE INDEX IF NOT EXISTS idx_messages_test_metadata 
ON messages((metadata->>'is_test')) 
WHERE metadata->>'is_test' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_test_metadata 
ON profiles((metadata->>'is_test_user')) 
WHERE metadata->>'is_test_user' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkins_test_metadata 
ON checkins((metadata->>'is_test')) 
WHERE metadata->>'is_test' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recommendations_test_metadata 
ON recommendations((metadata->>'is_test')) 
WHERE metadata->>'is_test' IS NOT NULL;

-- Comments
COMMENT ON FUNCTION create_test_user IS 'Creates a test user for automated testing';
COMMENT ON FUNCTION clean_test_data IS 'Cleans up test data older than specified interval';
COMMENT ON FUNCTION generate_test_data IS 'Generates a complete set of test data for testing';
COMMENT ON FUNCTION validate_oauth_params IS 'Validates OAuth parameters for different platforms';