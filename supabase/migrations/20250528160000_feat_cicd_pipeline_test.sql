-- Test migration for CI/CD pipeline verification
-- This migration adds a test table that can be safely removed after testing

CREATE TABLE IF NOT EXISTS test_cicd_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL,
    test_timestamp TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{"test": true}'::jsonb
);

-- Add a comment to the table
COMMENT ON TABLE test_cicd_verification IS 'Temporary table for CI/CD pipeline testing - safe to remove';

-- Insert a test record
INSERT INTO test_cicd_verification (test_name)
VALUES ('CI/CD Pipeline Test - ' || now()::text);

-- Create a simple function for testing edge function deployment
CREATE OR REPLACE FUNCTION get_test_cicd_data()
RETURNS TABLE (
    id UUID,
    test_name TEXT,
    test_timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tcd.id,
        tcd.test_name,
        tcd.test_timestamp
    FROM test_cicd_verification tcd
    ORDER BY tcd.test_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_test_cicd_data() TO anon;
GRANT EXECUTE ON FUNCTION get_test_cicd_data() TO authenticated;