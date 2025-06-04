-- Fix user_stats RLS policies to allow triggers to work properly
-- The trigger function runs in the context of the user, so we need INSERT/UPDATE policies

-- Add INSERT policy for users to create their own stats record
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for users to update their own stats record
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Also ensure the trigger function has the proper permissions
-- by running it with SECURITY DEFINER to use the function owner's permissions
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update stats when checkins change
  IF TG_TABLE_NAME = 'checkins' THEN
    INSERT INTO user_stats (user_id, total_checkins, completed_checkins, metadata)
    VALUES (
      NEW.user_id, 
      1, 
      CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
      COALESCE(NEW.metadata, '{}'::jsonb)
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      total_checkins = user_stats.total_checkins + 1,
      completed_checkins = user_stats.completed_checkins + 
        CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
      abandoned_checkins = user_stats.abandoned_checkins + 
        CASE WHEN NEW.status = 'abandoned' THEN 1 ELSE 0 END,
      last_activity = NOW(),
      updated_at = NOW(),
      -- Merge metadata to preserve test_run_id
      metadata = user_stats.metadata || COALESCE(NEW.metadata, '{}'::jsonb);
  END IF;
  
  -- Update stats when messages are created
  IF TG_TABLE_NAME = 'messages' THEN
    INSERT INTO user_stats (user_id, total_messages, metadata)
    VALUES (
      NEW.user_id, 
      1,
      COALESCE(NEW.metadata, '{}'::jsonb)
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      total_messages = user_stats.total_messages + 1,
      last_activity = NOW(),
      updated_at = NOW(),
      -- Merge metadata to preserve test_run_id
      metadata = user_stats.metadata || COALESCE(NEW.metadata, '{}'::jsonb);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON user_stats TO authenticated;