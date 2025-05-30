-- Add log_event RPC function for analytics
DROP FUNCTION IF EXISTS log_event(TEXT, JSONB);
CREATE OR REPLACE FUNCTION log_event(
  event_name TEXT,
  properties JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
  -- For now, just insert into a simple events table
  -- In production, this could integrate with analytics platforms
  INSERT INTO analytics_events (
    event_name,
    properties,
    user_id,
    created_at
  ) VALUES (
    event_name,
    properties,
    auth.uid(),
    NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail if analytics logging fails
    RAISE WARNING 'Failed to log analytics event: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create analytics_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Add index for querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created 
  ON analytics_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created 
  ON analytics_events(event_name, created_at DESC);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own events
CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role has full access" ON analytics_events
  FOR ALL USING (auth.role() = 'service_role');