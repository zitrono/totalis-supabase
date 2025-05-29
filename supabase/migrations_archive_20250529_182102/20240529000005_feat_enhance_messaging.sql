-- Enhance messages table for voice messages, threading, and better pagination
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS voice_url TEXT,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER CHECK (duration_seconds > 0),
ADD COLUMN IF NOT EXISTS thread_id UUID,
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'system')),
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create message_threads table
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  title TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_voice ON messages(user_id, message_type) WHERE message_type = 'voice';
CREATE INDEX IF NOT EXISTS idx_messages_pagination ON messages(user_id, category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_user ON message_threads(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_category ON message_threads(category_id);

-- No constraint on thread_id for now as existing messages don't have it

-- Enable RLS on message_threads
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_threads
CREATE POLICY "Users can view their own threads" ON message_threads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own threads" ON message_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads" ON message_threads
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to create or get thread
CREATE OR REPLACE FUNCTION get_or_create_thread(
  p_user_id UUID,
  p_category_id UUID,
  p_coach_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_thread_id UUID;
BEGIN
  -- Try to find existing active thread
  SELECT id INTO v_thread_id
  FROM message_threads
  WHERE user_id = p_user_id
    AND category_id = p_category_id
    AND (coach_id = p_coach_id OR (coach_id IS NULL AND p_coach_id IS NULL))
    AND is_archived = false
  ORDER BY last_message_at DESC
  LIMIT 1;
  
  -- Create new thread if not found
  IF v_thread_id IS NULL THEN
    INSERT INTO message_threads (user_id, category_id, coach_id, title)
    VALUES (p_user_id, p_category_id, p_coach_id, p_title)
    RETURNING id INTO v_thread_id;
  END IF;
  
  RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Function for paginated message retrieval
CREATE OR REPLACE FUNCTION get_messages_paginated(
  p_user_id UUID,
  p_category_id UUID,
  p_thread_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_before_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  role TEXT,
  message_type TEXT,
  voice_url TEXT,
  duration_seconds INTEGER,
  thread_id UUID,
  reply_to_id UUID,
  is_edited BOOLEAN,
  edited_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  reply_to_content TEXT,
  reply_to_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.role,
    m.message_type,
    m.voice_url,
    m.duration_seconds,
    m.thread_id,
    m.reply_to_id,
    m.is_edited,
    m.edited_at,
    m.read_at,
    m.created_at,
    r.content as reply_to_content,
    r.role as reply_to_role
  FROM messages m
  LEFT JOIN messages r ON m.reply_to_id = r.id
  WHERE m.user_id = p_user_id
    AND m.category_id = p_category_id
    AND (p_thread_id IS NULL OR m.thread_id = p_thread_id)
    AND (p_before_timestamp IS NULL OR m.created_at < p_before_timestamp)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_user_id UUID,
  p_thread_id UUID,
  p_until_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE messages
  SET read_at = NOW()
  WHERE user_id = p_user_id
    AND thread_id = p_thread_id
    AND role = 'assistant'
    AND read_at IS NULL
    AND created_at <= p_until_timestamp;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update thread last_message_at
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE message_threads
    SET 
      last_message_at = NEW.created_at,
      message_count = message_count + 1,
      updated_at = NOW()
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_thread_on_new_message ON messages;
CREATE TRIGGER update_thread_on_new_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_thread_last_message();

-- Trigger for message_threads updated_at
DROP TRIGGER IF EXISTS update_message_threads_updated_at ON message_threads;
CREATE TRIGGER update_message_threads_updated_at BEFORE UPDATE ON message_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON COLUMN messages.voice_url IS 'URL to voice message audio file';
COMMENT ON COLUMN messages.duration_seconds IS 'Duration of voice message in seconds';
COMMENT ON COLUMN messages.thread_id IS 'Thread this message belongs to';
COMMENT ON COLUMN messages.reply_to_id IS 'Message this is replying to';
COMMENT ON COLUMN messages.message_type IS 'Type of message: text, voice, image, system';
COMMENT ON TABLE message_threads IS 'Conversation threads for organizing messages';