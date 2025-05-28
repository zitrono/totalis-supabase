-- Add missing fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_tester BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS birth_year INTEGER,
ADD COLUMN IF NOT EXISTS summarization_enabled BOOLEAN DEFAULT false;

-- Add missing fields to coaches table
ALTER TABLE coaches
ADD COLUMN IF NOT EXISTS voice TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS image_small_url TEXT,
ADD COLUMN IF NOT EXISTS image_medium_url TEXT,
ADD COLUMN IF NOT EXISTS image_large_url TEXT,
ADD COLUMN IF NOT EXISTS system_prompt TEXT;

-- Add missing fields to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS followup_chat_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prompt_followup TEXT;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_profiles_is_tester ON profiles(is_tester) WHERE is_tester = true;
CREATE INDEX IF NOT EXISTS idx_profiles_birth_year ON profiles(birth_year);

-- Add RLS policies for new fields
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON COLUMN profiles.is_tester IS 'Flag to identify test users for analytics separation';
COMMENT ON COLUMN profiles.birth_year IS 'Birth year only for privacy (replaces full birthdate)';
COMMENT ON COLUMN profiles.summarization_enabled IS 'Whether user has summarization features enabled';
COMMENT ON COLUMN coaches.voice IS 'Text-to-speech voice selection for this coach';
COMMENT ON COLUMN coaches.system_prompt IS 'System prompt for AI interactions with this coach';
COMMENT ON COLUMN categories.followup_chat_enabled IS 'Whether follow-up chat is enabled for this category';
COMMENT ON COLUMN categories.prompt_followup IS 'Prompt template for follow-up conversations';