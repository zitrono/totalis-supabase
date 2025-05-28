-- Add system logs table for tracking important events
-- This is a minor database change to test CI/CD

CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON system_logs(event_type);

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read logs
CREATE POLICY "Authenticated users can read system logs" ON system_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Service role can insert logs
CREATE POLICY "Service role can insert system logs" ON system_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Insert initial log entry
INSERT INTO system_logs (event_type, event_data)
VALUES ('system_initialized', '{"version": "1.0.0", "migration": "20250528183000_feat_add_system_logs"}'::jsonb);

COMMENT ON TABLE system_logs IS 'System event logging for audit and debugging';