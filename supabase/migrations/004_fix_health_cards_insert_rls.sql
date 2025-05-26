-- Add INSERT policy for health_cards table
CREATE POLICY "Users can create own health cards" ON health_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also add a policy for service role to create health cards (for edge functions)
CREATE POLICY "Service role can create health cards" ON health_cards
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');