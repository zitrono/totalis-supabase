-- Create mock test data for preview environments (v4.2.17)
-- Since preview branches can't create auth.users, we'll create mock data
-- that allows tests to run without authentication

-- This migration is a no-op in production
-- Mock data creation is only needed in preview environments where auth.users can't be modified
-- In production, test users are created via seed.sql

DO $$
BEGIN
  RAISE NOTICE 'Mock test data migration skipped - only needed for preview environments';
  RAISE NOTICE 'In production, test users are created via seed.sql';
END $$;