-- Phase 5: Minimal Core Features Setup
-- Generated: 2025-01-26  
-- Description: Add only essential missing columns and functions

-- Add missing columns to messages table
DO $$
BEGIN
    -- Add conversation_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='conversation_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN conversation_id UUID DEFAULT gen_random_uuid();
        -- Update existing messages to have unique conversation_id per user
        UPDATE messages SET conversation_id = gen_random_uuid() WHERE conversation_id IS NULL;
    END IF;

    -- Add message_order column if it doesn't exist  
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='message_order'
    ) THEN
        ALTER TABLE messages ADD COLUMN message_order INTEGER DEFAULT 1;
    END IF;

    -- Add ref_category_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='ref_category_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN ref_category_id UUID;
    END IF;

    -- Add ref_checkin_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='ref_checkin_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN ref_checkin_id UUID;
    END IF;

    -- Add ref_recommendation_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='ref_recommendation_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN ref_recommendation_id UUID;
    END IF;

    -- Add is_read column if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='is_read'
    ) THEN
        ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;

    -- Add ai_processed column if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='ai_processed'
    ) THEN
        ALTER TABLE messages ADD COLUMN ai_processed BOOLEAN DEFAULT false;
    END IF;

    -- Add ai_response_time_ms column if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='ai_response_time_ms'
    ) THEN
        ALTER TABLE messages ADD COLUMN ai_response_time_ms INTEGER;
    END IF;
END $$;

-- Create essential indexes for messages 
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, message_order);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_refs ON messages (ref_category_id, ref_checkin_id, ref_recommendation_id);

-- Create checkins table if it doesn't exist (simplified)
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  user_category_id UUID, -- Reference to be added later
  wellness_level DECIMAL(3,2) DEFAULT 0.0 CHECK (wellness_level >= 0.0 AND wellness_level <= 10.0),
  summary TEXT,
  insights TEXT,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'abandoned')),
  current_question INTEGER DEFAULT 1,
  total_questions INTEGER DEFAULT 0,
  responses JSONB DEFAULT '[]',
  completion_percentage DECIMAL(5,2) DEFAULT 0.0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create basic indexes for checkins
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins (user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_category ON checkins (category_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins (status);

-- Enable RLS for checkins
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for checkins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'checkins' AND policyname = 'Users can view own checkins'
    ) THEN
        CREATE POLICY "Users can view own checkins" ON checkins
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'checkins' AND policyname = 'Users can insert own checkins'
    ) THEN
        CREATE POLICY "Users can insert own checkins" ON checkins
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'checkins' AND policyname = 'Users can update own checkins'
    ) THEN
        CREATE POLICY "Users can update own checkins" ON checkins
          FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add missing columns to user_categories if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_categories') THEN
        -- Add total_checkins column if it doesn't exist
        IF NOT EXISTS (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='user_categories' AND column_name='total_checkins'
        ) THEN
            ALTER TABLE user_categories ADD COLUMN total_checkins INTEGER DEFAULT 0;
        END IF;

        -- Add last_checkin_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='user_categories' AND column_name='last_checkin_at'
        ) THEN
            ALTER TABLE user_categories ADD COLUMN last_checkin_at TIMESTAMPTZ;
        END IF;

        -- Add average_wellness_level column if it doesn't exist
        IF NOT EXISTS (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='user_categories' AND column_name='average_wellness_level'
        ) THEN
            ALTER TABLE user_categories ADD COLUMN average_wellness_level DECIMAL(3,2) DEFAULT 0.0;
        END IF;
    END IF;
END $$;

-- Create essential utility functions
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE messages 
  SET is_read = true, updated_at = NOW()
  WHERE conversation_id = conversation_uuid 
  AND user_id = auth.uid()
  AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user chat conversations
CREATE OR REPLACE FUNCTION get_user_conversations(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  conversation_id UUID,
  last_message_at TIMESTAMPTZ,
  message_count BIGINT,
  unread_count BIGINT,
  last_message_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.conversation_id,
    MAX(m.created_at) as last_message_at,
    COUNT(*) as message_count,
    SUM(CASE WHEN NOT m.is_read THEN 1 ELSE 0 END) as unread_count,
    (SELECT message_text FROM messages WHERE conversation_id = m.conversation_id ORDER BY created_at DESC LIMIT 1) as last_message_text
  FROM messages m
  WHERE m.user_id = user_uuid
  GROUP BY m.conversation_id
  ORDER BY MAX(m.created_at) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(conversation_uuid UUID, user_uuid UUID)
RETURNS TABLE (
  id UUID,
  message_text TEXT,
  message_type TEXT,
  coach_id UUID,
  ref_category_id UUID,
  ref_checkin_id UUID,
  ref_recommendation_id UUID,
  is_read BOOLEAN,
  ai_processed BOOLEAN,
  ai_response_time_ms INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.message_text,
    m.message_type,
    m.coach_id,
    m.ref_category_id,
    m.ref_checkin_id,
    m.ref_recommendation_id,
    m.is_read,
    m.ai_processed,
    m.ai_response_time_ms,
    m.created_at,
    m.updated_at
  FROM messages m
  WHERE m.conversation_id = conversation_uuid 
  AND m.user_id = user_uuid
  ORDER BY m.message_order, m.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;