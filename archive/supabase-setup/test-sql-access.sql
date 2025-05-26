
-- Minimal test to verify SQL execution works
-- Run this first in Supabase SQL Editor

-- Check current database
SELECT current_database(), current_user, version();

-- Create a simple test table
CREATE TABLE IF NOT EXISTS test_connection (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verify it worked
SELECT * FROM test_connection;

-- Clean up
DROP TABLE IF EXISTS test_connection;

-- If this works, proceed with the full migration
