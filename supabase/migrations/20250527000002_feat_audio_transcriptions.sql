-- Create audio_transcriptions table for storing transcribed audio
CREATE TABLE IF NOT EXISTS audio_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  transcription TEXT NOT NULL,
  duration INTEGER, -- Duration in seconds
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_user ON audio_transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_created ON audio_transcriptions(created_at DESC);

-- Enable RLS
ALTER TABLE audio_transcriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transcriptions" ON audio_transcriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transcriptions" ON audio_transcriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcriptions" ON audio_transcriptions
  FOR DELETE USING (auth.uid() = user_id);