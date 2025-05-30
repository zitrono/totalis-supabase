-- Fix the functions to work without creating profiles
-- These functions should be called by authenticated users who already have profiles

-- Fix 1: Update toggle_category_favorite to not create profiles
CREATE OR REPLACE FUNCTION toggle_category_favorite(p_user_id UUID, p_category_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_favorite BOOLEAN;
BEGIN
  -- Simply toggle favorite, assuming profile exists
  -- If it doesn't, the foreign key will catch it
  INSERT INTO user_categories (user_id, category_id, is_favorite, last_interaction_at)
  VALUES (p_user_id, p_category_id, true, NOW())
  ON CONFLICT (user_id, category_id) 
  DO UPDATE SET 
    is_favorite = NOT user_categories.is_favorite,
    last_interaction_at = NOW(),
    updated_at = NOW()
  RETURNING is_favorite INTO v_is_favorite;
  
  RETURN v_is_favorite;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'User profile does not exist';
END;
$$ LANGUAGE plpgsql;

-- Fix 2: Update get_or_create_thread to not create profiles
CREATE OR REPLACE FUNCTION get_or_create_thread(
  p_user_id UUID,
  p_category_id UUID,
  p_coach_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_thread_id UUID;
BEGIN
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
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'User profile or category does not exist';
END;
$$ LANGUAGE plpgsql;

-- Fix 3: Create test-only functions that bypass auth constraints
-- These should ONLY be used for testing and development

CREATE OR REPLACE FUNCTION test_toggle_category_favorite(p_user_id UUID, p_category_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_favorite BOOLEAN;
BEGIN
  -- For testing: check if test user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    -- For test users, we can't create profiles due to auth.users constraint
    -- So we'll just return false
    RETURN false;
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

-- Remove SECURITY DEFINER from functions
ALTER FUNCTION toggle_category_favorite(UUID, UUID) SECURITY INVOKER;
ALTER FUNCTION get_or_create_thread(UUID, UUID, UUID, TEXT) SECURITY INVOKER;

-- Add helpful comments
COMMENT ON FUNCTION toggle_category_favorite IS 'Toggles favorite status for a category. Requires existing profile.';
COMMENT ON FUNCTION get_or_create_thread IS 'Gets or creates a message thread. Requires existing profile.';
COMMENT ON FUNCTION test_toggle_category_favorite IS 'TEST ONLY: Toggles favorite status, safe for non-existent profiles.';