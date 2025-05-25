-- Fix RLS policy for health_cards table to allow inserts

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own health cards" ON health_cards;
DROP POLICY IF EXISTS "Users can update own health cards" ON health_cards;

-- Create new policies
CREATE POLICY "Users can view own health cards" ON health_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own health cards" ON health_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health cards" ON health_cards
  FOR UPDATE USING (auth.uid() = user_id);

-- Also allow service role to create cards (for backend/edge functions)
CREATE POLICY "Service role can manage all health cards" ON health_cards
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');