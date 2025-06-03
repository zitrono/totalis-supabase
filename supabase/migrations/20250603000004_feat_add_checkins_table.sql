-- Create checkins table expected by mobile app (v4.2.17)
-- Mobile app Edge Functions expect 'checkins' not 'check_in_sessions'
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  coach_id UUID REFERENCES coaches(id),
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  wellness_level INTEGER CHECK (wellness_level >= 1 AND wellness_level <= 10),
  proposals JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_category_id ON checkins(category_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_user_status ON checkins(user_id, status);

-- Create checkin_answers table for storing individual question responses
CREATE TABLE IF NOT EXISTS checkin_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_text TEXT,
  answer JSONB,
  answer_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for checkin_answers
CREATE INDEX IF NOT EXISTS idx_checkin_answers_checkin_id ON checkin_answers(checkin_id);

-- Enable RLS on both tables
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for checkins
DROP POLICY IF EXISTS "Users can view own checkins" ON checkins;
CREATE POLICY "Users can view own checkins" ON checkins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own checkins" ON checkins;
CREATE POLICY "Users can insert own checkins" ON checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own checkins" ON checkins;
CREATE POLICY "Users can update own checkins" ON checkins
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for checkin_answers
DROP POLICY IF EXISTS "Users can view own checkin answers" ON checkin_answers;
CREATE POLICY "Users can view own checkin answers" ON checkin_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM checkins 
      WHERE checkins.id = checkin_answers.checkin_id 
      AND checkins.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own checkin answers" ON checkin_answers;
CREATE POLICY "Users can insert own checkin answers" ON checkin_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM checkins 
      WHERE checkins.id = checkin_answers.checkin_id 
      AND checkins.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON checkins TO authenticated;
GRANT SELECT, INSERT ON checkin_answers TO authenticated;