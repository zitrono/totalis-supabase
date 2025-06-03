-- Create health_cards table expected by mobile app (v4.2.19)
-- Note: Table already exists in production, so we'll add missing columns
CREATE TABLE IF NOT EXISTS health_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  insight TEXT,
  action TEXT,
  why TEXT,
  category_id UUID REFERENCES categories(id),
  importance INTEGER DEFAULT 5,
  relevance NUMERIC(3,2) DEFAULT 0.5,
  is_active BOOLEAN DEFAULT true,
  viewed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE health_cards ADD COLUMN IF NOT EXISTS recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE health_cards ADD COLUMN IF NOT EXISTS insight TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE health_cards ADD COLUMN IF NOT EXISTS action TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE health_cards ADD COLUMN IF NOT EXISTS why TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_health_cards_user_id ON health_cards(user_id);
-- Only create recommendation_id index if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_cards' AND column_name = 'recommendation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_health_cards_recommendation_id ON health_cards(recommendation_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_health_cards_category_id ON health_cards(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_health_cards_active ON health_cards(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE health_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own health cards" ON health_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health cards" ON health_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health cards" ON health_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health cards" ON health_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON health_cards TO authenticated;