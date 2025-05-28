-- Fix RLS policies to allow service role full access
-- This resolves "permission denied" errors when service role tries to insert data

-- Enable RLS on recommendations table if not already enabled
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is properly configured for recommendations table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendations;
DROP POLICY IF EXISTS "Users can update own recommendations" ON recommendations;
DROP POLICY IF EXISTS "Users can create own recommendations" ON recommendations;
DROP POLICY IF EXISTS "Service role has full access" ON recommendations;

-- Recreate policies with service role support
CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recommendations" ON recommendations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" ON recommendations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access" ON recommendations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Fix the same for other tables that might have similar issues
-- Messages table
DROP POLICY IF EXISTS "Service role has full access" ON messages;
CREATE POLICY "Service role has full access" ON messages
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Checkins table
DROP POLICY IF EXISTS "Service role has full access" ON checkins;
CREATE POLICY "Service role has full access" ON checkins
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Profiles table
DROP POLICY IF EXISTS "Service role has full access" ON profiles;
CREATE POLICY "Service role has full access" ON profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Categories table already allows public/anon access, but add service role for consistency
DROP POLICY IF EXISTS "Service role has full access" ON categories;
CREATE POLICY "Service role has full access" ON categories
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Profile categories table
DROP POLICY IF EXISTS "Service role has full access" ON profile_categories;
CREATE POLICY "Service role has full access" ON profile_categories
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Grant execute permissions on functions that might be needed
GRANT EXECUTE ON FUNCTION auth.uid() TO service_role;
GRANT EXECUTE ON FUNCTION auth.jwt() TO service_role;