-- Create audio_usage_logs table for analytics and billing

CREATE TABLE IF NOT EXISTS audio_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  transcription_length INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_audio_usage_user_id ON audio_usage_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audio_usage_created_at ON audio_usage_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audio_usage_success ON audio_usage_logs (success);

-- Enable RLS
ALTER TABLE audio_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only service role can insert, users can view their own
CREATE POLICY "Service role can insert usage logs" ON audio_usage_logs
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view own usage logs" ON audio_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON audio_usage_logs TO authenticated;
GRANT ALL ON audio_usage_logs TO service_role;

-- Create view for user analytics
CREATE OR REPLACE VIEW user_audio_analytics AS
SELECT 
  user_id,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  COUNT(*) FILTER (WHERE success = false) as failed_requests,
  SUM(file_size) as total_bytes_processed,
  AVG(processing_time_ms)::INTEGER as avg_processing_time_ms,
  SUM(transcription_length) as total_characters_transcribed,
  AVG(transcription_length)::INTEGER as avg_transcription_length
FROM audio_usage_logs
GROUP BY user_id, DATE_TRUNC('day', created_at);

-- Create view for admin analytics
CREATE OR REPLACE VIEW admin_audio_analytics AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  COUNT(*) FILTER (WHERE success = false) as failed_requests,
  SUM(file_size) as total_bytes_processed,
  AVG(processing_time_ms)::INTEGER as avg_processing_time_ms,
  MAX(processing_time_ms) as max_processing_time_ms,
  SUM(transcription_length) as total_characters_transcribed,
  ROUND(AVG(file_size / 1024.0 / 1024.0), 2) as avg_file_size_mb
FROM audio_usage_logs
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Function to get user's monthly usage
CREATE OR REPLACE FUNCTION get_user_audio_usage(p_user_id UUID, p_month DATE DEFAULT DATE_TRUNC('month', NOW()))
RETURNS TABLE (
  total_requests INTEGER,
  successful_requests INTEGER,
  total_mb_processed DECIMAL(10,2),
  total_minutes_audio DECIMAL(10,2),
  total_characters INTEGER,
  avg_processing_time_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_requests,
    COUNT(*) FILTER (WHERE success = true)::INTEGER as successful_requests,
    ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as total_mb_processed,
    ROUND(SUM(file_size) / 16000.0 / 60.0, 2) as total_minutes_audio, -- Estimate based on 16kHz mono
    SUM(transcription_length)::INTEGER as total_characters,
    AVG(processing_time_ms)::INTEGER as avg_processing_time_ms
  FROM audio_usage_logs
  WHERE user_id = p_user_id
    AND created_at >= p_month
    AND created_at < p_month + INTERVAL '1 month';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_audio_usage TO authenticated;