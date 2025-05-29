-- Add policies for test users to create recommendations
CREATE POLICY "Test users can create recommendations" ON recommendations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email LIKE '%@totalis.test'
    )
  );