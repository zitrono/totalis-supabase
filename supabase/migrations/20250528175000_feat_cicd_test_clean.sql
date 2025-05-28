-- Clean CI/CD test migration
-- Tests the complete pipeline after fixes

CREATE TABLE IF NOT EXISTS cicd_test_clean (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{"test": true}'::jsonb
);

-- Enable RLS
ALTER TABLE cicd_test_clean ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow authenticated read" ON cicd_test_clean
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert test record
INSERT INTO cicd_test_clean (test_name)
VALUES ('CI/CD Clean Test - ' || now()::text);

COMMENT ON TABLE cicd_test_clean IS 'Clean test table for CI/CD verification';