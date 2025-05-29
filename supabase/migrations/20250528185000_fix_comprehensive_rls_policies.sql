-- Fix comprehensive RLS policies for all tables to support both service role and authenticated users

-- Enable RLS on core tables that we know exist
DO $$ 
BEGIN
  -- Enable RLS on existing tables only
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'messages') THEN
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'recommendations') THEN
    ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_categories') THEN
    ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'checkins') THEN
    ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Service role has full access" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role bypass" ON profiles;

-- Profiles table policies
CREATE POLICY "Service role has full access to profiles" ON profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Authenticated users can view own profile" ON profiles
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    auth.uid() = id
  );

CREATE POLICY "Authenticated users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = id
  );

CREATE POLICY "Authenticated users can update own profile" ON profiles
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    auth.uid() = id
  );

-- Messages table policies  
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'messages') THEN
    DROP POLICY IF EXISTS "Service role has full access" ON messages;
    DROP POLICY IF EXISTS "Users can view own messages" ON messages;
    DROP POLICY IF EXISTS "Users can create messages" ON messages;

    CREATE POLICY "Service role has full access to messages" ON messages
      FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    CREATE POLICY "Authenticated users can view own messages" ON messages
      FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        auth.uid() = user_id
      );

    CREATE POLICY "Authenticated users can create own messages" ON messages
      FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        auth.uid() = user_id
      );
  END IF;
END $$;

-- Recommendations table policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'recommendations') THEN
    DROP POLICY IF EXISTS "Service role has full access" ON recommendations;
    DROP POLICY IF EXISTS "Users can view recommendations" ON recommendations;
    DROP POLICY IF EXISTS "Users can create recommendations" ON recommendations;

    CREATE POLICY "Service role has full access to recommendations" ON recommendations
      FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    CREATE POLICY "Authenticated users can view own recommendations" ON recommendations
      FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        auth.uid() = user_id
      );

    CREATE POLICY "Authenticated users can create own recommendations" ON recommendations
      FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        auth.uid() = user_id
      );
  END IF;
END $$;

-- User categories table policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_categories') THEN
    DROP POLICY IF EXISTS "Service role has full access" ON user_categories;
    DROP POLICY IF EXISTS "Users can manage own categories" ON user_categories;

    CREATE POLICY "Service role has full access to user_categories" ON user_categories
      FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    CREATE POLICY "Authenticated users can manage own categories" ON user_categories
      FOR ALL USING (
        auth.role() = 'authenticated' AND 
        auth.uid() = user_id
      );
  END IF;
END $$;

-- Checkins table policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'checkins') THEN
    DROP POLICY IF EXISTS "Service role has full access" ON checkins;
    DROP POLICY IF EXISTS "Users can manage own checkins" ON checkins;

    CREATE POLICY "Service role has full access to checkins" ON checkins
      FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    CREATE POLICY "Authenticated users can manage own checkins" ON checkins
      FOR ALL USING (
        auth.role() = 'authenticated' AND 
        auth.uid() = user_id
      );
  END IF;
END $$;

-- Grant necessary permissions to authenticated role for foreign key checks
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Ensure service role can access auth schema
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT ON auth.users TO service_role;