-- Create checkins table
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  proposals JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT checkins_completed_at_check CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

-- Create checkin_answers table
CREATE TABLE IF NOT EXISTS checkin_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer JSONB NOT NULL,
  answer_type TEXT CHECK (answer_type IN ('text', 'number', 'boolean', 'scale', 'multiple_choice')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- Create checkin_templates table for category-specific questions
CREATE TABLE IF NOT EXISTS checkin_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(category_id, is_active)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_category_id ON checkins(category_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_started_at ON checkins(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_answers_checkin_id ON checkin_answers(checkin_id);
CREATE INDEX IF NOT EXISTS idx_checkin_templates_category_id ON checkin_templates(category_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checkins
CREATE POLICY "Users can view their own checkins" ON checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checkins" ON checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkins" ON checkins
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for checkin_answers
CREATE POLICY "Users can view their own checkin answers" ON checkin_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM checkins 
      WHERE checkins.id = checkin_answers.checkin_id 
      AND checkins.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create answers for their own checkins" ON checkin_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM checkins 
      WHERE checkins.id = checkin_answers.checkin_id 
      AND checkins.user_id = auth.uid()
    )
  );

-- RLS Policies for checkin_templates (read-only for users)
CREATE POLICY "Anyone can view active templates" ON checkin_templates
  FOR SELECT USING (is_active = true);

-- Functions for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
DROP TRIGGER IF EXISTS update_checkins_updated_at ON checkins;
CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_checkin_templates_updated_at ON checkin_templates;
CREATE TRIGGER update_checkin_templates_updated_at BEFORE UPDATE ON checkin_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE checkins IS 'User check-in sessions for categories';
COMMENT ON TABLE checkin_answers IS 'Answers provided during check-in sessions';
COMMENT ON TABLE checkin_templates IS 'Question templates for category check-ins';