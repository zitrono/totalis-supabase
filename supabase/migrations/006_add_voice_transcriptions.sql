-- Create voice_transcriptions table for storing audio transcription records

CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  duration_seconds DECIMAL(10,1),
  transcription TEXT NOT NULL,
  context_type TEXT, -- 'chat', 'checkin', 'category'
  context_id UUID, -- Reference to related entity
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for user queries
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_user_id ON voice_transcriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_created_at ON voice_transcriptions (created_at);

-- Enable RLS
ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transcriptions" ON voice_transcriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transcriptions" ON voice_transcriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcriptions" ON voice_transcriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON voice_transcriptions TO authenticated;
GRANT SELECT ON voice_transcriptions TO anon;