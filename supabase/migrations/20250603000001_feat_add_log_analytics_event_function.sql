-- Add missing RPC function that mobile app calls (v4.2.18)
CREATE OR REPLACE FUNCTION log_analytics_event(
  p_event_type TEXT,
  p_event_data JSONB,
  p_platform TEXT,
  p_app_version TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO analytics_events (event_type, event_data, platform, app_version, user_id)
  VALUES (p_event_type, p_event_data, p_platform, p_app_version, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_analytics_event TO authenticated;