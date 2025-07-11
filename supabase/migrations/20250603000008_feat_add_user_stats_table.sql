-- Create user_stats table for analytics (v4.2.19)
-- First check if user_stats exists as a view and drop it
DO $$
BEGIN
  -- Check if user_stats exists as a view
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'user_stats'
  ) THEN
    DROP VIEW user_stats CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_checkins INTEGER DEFAULT 0,
  completed_checkins INTEGER DEFAULT 0,
  abandoned_checkins INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_recommendations INTEGER DEFAULT 0,
  active_recommendations INTEGER DEFAULT 0,
  categories_selected INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ,
  streak_days INTEGER DEFAULT 0,
  wellness_average NUMERIC(3,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only create index if user_stats is a table (not a view)
DO $$
BEGIN
  -- Check if user_stats is a table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_stats' AND table_type = 'BASE TABLE'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
  END IF;
END $$;

-- Enable RLS only if it's a table
DO $$
BEGIN
  -- Check if user_stats is a table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_stats' AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- RLS policies (only if it's a table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_stats' AND table_type = 'BASE TABLE'
  ) THEN
    DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
    CREATE POLICY "Users can view own stats" ON user_stats
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats when checkins change
  IF TG_TABLE_NAME = 'checkins' THEN
    INSERT INTO user_stats (user_id, total_checkins, completed_checkins)
    VALUES (NEW.user_id, 1, CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END)
    ON CONFLICT (user_id) DO UPDATE
    SET 
      total_checkins = user_stats.total_checkins + 1,
      completed_checkins = user_stats.completed_checkins + 
        CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
      abandoned_checkins = user_stats.abandoned_checkins + 
        CASE WHEN NEW.status = 'abandoned' THEN 1 ELSE 0 END,
      last_activity = NOW(),
      updated_at = NOW();
  END IF;
  
  -- Update stats when messages are created
  IF TG_TABLE_NAME = 'messages' THEN
    INSERT INTO user_stats (user_id, total_messages)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET 
      total_messages = user_stats.total_messages + 1,
      last_activity = NOW(),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_user_stats_on_checkin ON checkins;
CREATE TRIGGER update_user_stats_on_checkin
  AFTER INSERT OR UPDATE ON checkins
  FOR EACH ROW EXECUTE FUNCTION update_user_stats();

DROP TRIGGER IF EXISTS update_user_stats_on_message ON messages;
CREATE TRIGGER update_user_stats_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- Grant permissions
GRANT SELECT ON user_stats TO authenticated;