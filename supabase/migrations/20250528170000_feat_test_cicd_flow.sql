-- Test migration for CI/CD flow verification
-- This creates a simple test table to verify the pipeline

CREATE TABLE IF NOT EXISTS cicd_flow_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{"test": true}'::jsonb
);

-- Add RLS policy
ALTER TABLE cicd_flow_test ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users" ON cicd_flow_test
    FOR SELECT TO authenticated
    USING (true);

-- Insert test record
INSERT INTO cicd_flow_test (test_name)
VALUES ('CI/CD Flow Test - ' || now()::text);

-- Add comment
COMMENT ON TABLE cicd_flow_test IS 'Test table for CI/CD flow verification - safe to drop after testing';