-- Migration: Add missing fields for v4.0.0 feature parity
-- =====================================================
-- This migration adds fields that were present in v3.0.6 but missing in v4.0.0

-- 1. Add missing fields to profiles table
-- =======================================

-- Add first_name and last_name fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS is_tester BOOLEAN DEFAULT false;

-- Create index for tester accounts
CREATE INDEX IF NOT EXISTS idx_profiles_is_tester ON profiles(is_tester);

-- Update metadata structure for profiles
COMMENT ON COLUMN profiles.metadata IS 'JSONB field containing: is_tester, legacy_user_id, summarization settings';

-- 2. Add missing fields to categories table
-- =========================================

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS followup_chat_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prompt_followup TEXT;

-- Update metadata structure for categories
COMMENT ON COLUMN categories.metadata IS 'JSONB field containing: legacy_id, icon_secondary, guidelines';

-- 3. Update coaches metadata structure
-- ====================================

-- Add comment to clarify metadata contents
COMMENT ON COLUMN coaches.metadata IS 'JSONB field containing: voiceId, voiceSettings (speed, pitch), images (small, medium, large URLs), systemPrompt';

-- 4. Create tables for missing functionality
-- ==========================================

-- Create checkins table if not exists
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  conversation_id UUID REFERENCES conversations(id),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create checkin_answers table
CREATE TABLE IF NOT EXISTS checkin_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add expires_at column to recommendations if it doesn't exist
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create user_devices table for push notifications
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_token)
);

-- 5. Create indexes for performance
-- =================================

CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_category_id ON checkins(category_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkin_answers_checkin_id ON checkin_answers(checkin_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires_at ON recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_token ON user_devices(device_token);

-- 6. Create views for complex queries
-- ===================================

-- Active recommendations view (filters expired items)
CREATE OR REPLACE VIEW recommendations_active AS
SELECT r.*,
       c.name as category_name,
       c.icon as category_icon,
       c.primary_color as category_color
FROM recommendations r
LEFT JOIN categories c ON r.category_id = c.id
WHERE r.is_active = true;

-- Checkins with answers view
CREATE OR REPLACE VIEW checkins_with_answers AS
SELECT c.*,
       cat.name as category_name,
       COUNT(ca.id) as answer_count,
       ARRAY_AGG(
         jsonb_build_object(
           'question_id', ca.question_id,
           'answer', ca.answer,
           'answered_at', ca.answered_at
         ) ORDER BY ca.answered_at
       ) as answers
FROM checkins c
LEFT JOIN categories cat ON c.category_id = cat.id
LEFT JOIN checkin_answers ca ON c.id = ca.checkin_id
GROUP BY c.id, cat.name;

-- 7. Update RLS policies
-- ======================

-- Checkins RLS
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own checkins" ON checkins;
DROP POLICY IF EXISTS "Users can create own checkins" ON checkins;
DROP POLICY IF EXISTS "Users can update own checkins" ON checkins;

-- Create policies
CREATE POLICY "Users can view own checkins" ON checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own checkins" ON checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins" ON checkins
  FOR UPDATE USING (auth.uid() = user_id);

-- Checkin answers RLS
ALTER TABLE checkin_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own checkin answers" ON checkin_answers;
DROP POLICY IF EXISTS "Users can create own checkin answers" ON checkin_answers;

CREATE POLICY "Users can view own checkin answers" ON checkin_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM checkins
      WHERE checkins.id = checkin_answers.checkin_id
      AND checkins.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own checkin answers" ON checkin_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM checkins
      WHERE checkins.id = checkin_answers.checkin_id
      AND checkins.user_id = auth.uid()
    )
  );

-- Recommendations RLS
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendations;

CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

-- User devices RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own devices" ON user_devices;
DROP POLICY IF EXISTS "Users can manage own devices" ON user_devices;

CREATE POLICY "Users can view own devices" ON user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own devices" ON user_devices
  FOR ALL USING (auth.uid() = user_id);

-- 8. Add triggers for updated_at
-- ==============================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON user_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();