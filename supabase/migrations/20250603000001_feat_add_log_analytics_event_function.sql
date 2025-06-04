-- Add missing RPC function that mobile app calls (v4.2.18)
-- This function is a placeholder until analytics_events table is created
CREATE OR REPLACE FUNCTION log_analytics_event(
  p_event_type TEXT,
  p_event_data JSONB,
  p_platform TEXT,
  p_app_version TEXT
) RETURNS void AS $$
BEGIN
  -- Placeholder function - does nothing until analytics_events table exists
  -- This prevents mobile app errors when calling this function
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_analytics_event TO authenticated;