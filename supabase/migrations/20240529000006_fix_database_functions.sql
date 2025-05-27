-- Fix 1: Correct column name in get_recommendation_tree function
CREATE OR REPLACE FUNCTION get_recommendation_tree(p_user_id UUID, p_category_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  level INTEGER,
  parent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE recommendation_tree AS (
    -- First level recommendations
    SELECT 
      r.id,
      r.title,
      r.recommendation_text as content,  -- Fixed: was r.content
      r.level,
      r.parent_recommendation_id as parent_id,
      r.created_at,
      r.expires_at,
      r.view_count
    FROM recommendations r
    WHERE r.user_id = p_user_id 
      AND r.category_id = p_category_id
      AND r.level = 1
      AND r.is_active = true
      AND (r.expires_at IS NULL OR r.expires_at > NOW())
    
    UNION ALL
    
    -- Second level recommendations
    SELECT 
      r.id,
      r.title,
      r.recommendation_text as content,  -- Fixed: was r.content
      r.level,
      r.parent_recommendation_id as parent_id,
      r.created_at,
      r.expires_at,
      r.view_count
    FROM recommendations r
    INNER JOIN recommendation_tree rt ON r.parent_recommendation_id = rt.id
    WHERE r.level = 2
      AND r.is_active = true
      AND (r.expires_at IS NULL OR r.expires_at > NOW())
  )
  SELECT * FROM recommendation_tree
  ORDER BY level, created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Fix 2: Update toggle_category_favorite to handle profile creation
CREATE OR REPLACE FUNCTION toggle_category_favorite(p_user_id UUID, p_category_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_favorite BOOLEAN;
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  -- Create profile if it doesn't exist
  IF NOT v_profile_exists THEN
    INSERT INTO profiles (id, created_at, updated_at)
    VALUES (p_user_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  -- Toggle favorite
  INSERT INTO user_categories (user_id, category_id, is_favorite, last_interaction_at)
  VALUES (p_user_id, p_category_id, true, NOW())
  ON CONFLICT (user_id, category_id) 
  DO UPDATE SET 
    is_favorite = NOT user_categories.is_favorite,
    last_interaction_at = NOW(),
    updated_at = NOW()
  RETURNING is_favorite INTO v_is_favorite;
  
  RETURN v_is_favorite;
END;
$$ LANGUAGE plpgsql;

-- Fix 3: Update get_or_create_thread to handle profile creation
CREATE OR REPLACE FUNCTION get_or_create_thread(
  p_user_id UUID,
  p_category_id UUID,
  p_coach_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_thread_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  -- Create profile if it doesn't exist
  IF NOT v_profile_exists THEN
    INSERT INTO profiles (id, created_at, updated_at)
    VALUES (p_user_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  -- Try to find existing active thread
  SELECT id INTO v_thread_id
  FROM message_threads
  WHERE user_id = p_user_id
    AND category_id = p_category_id
    AND (coach_id = p_coach_id OR (coach_id IS NULL AND p_coach_id IS NULL))
    AND is_archived = false
  ORDER BY last_message_at DESC
  LIMIT 1;
  
  -- Create new thread if not found
  IF v_thread_id IS NULL THEN
    INSERT INTO message_threads (user_id, category_id, coach_id, title)
    VALUES (p_user_id, p_category_id, p_coach_id, p_title)
    RETURNING id INTO v_thread_id;
  END IF;
  
  RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Fix 4: Update message_threads table to use gen_random_uuid()
-- First drop the default constraint
ALTER TABLE message_threads ALTER COLUMN id DROP DEFAULT;
-- Then add the correct default
ALTER TABLE message_threads ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Fix 5: Add security definer to functions that create profiles
ALTER FUNCTION toggle_category_favorite(UUID, UUID) SECURITY DEFINER;
ALTER FUNCTION get_or_create_thread(UUID, UUID, UUID, TEXT) SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION toggle_category_favorite IS 'Toggles favorite status for a category, creating profile if needed';
COMMENT ON FUNCTION get_or_create_thread IS 'Gets or creates a message thread, creating profile if needed';