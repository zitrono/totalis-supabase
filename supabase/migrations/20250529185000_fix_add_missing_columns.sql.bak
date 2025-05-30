-- Fix: Add missing columns that are referenced in seed.sql but were missed during consolidation

-- Add missing column to coaches table
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add missing columns to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS name_short TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_checkin_history BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS checkin_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS followup_timer INTEGER,
ADD COLUMN IF NOT EXISTS prompt_checkin TEXT,
ADD COLUMN IF NOT EXISTS prompt_checkin_2 TEXT,
ADD COLUMN IF NOT EXISTS guidelines_file_text TEXT,
ADD COLUMN IF NOT EXISTS max_questions INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS scope TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT,
ADD COLUMN IF NOT EXISTS secondary_color TEXT;

-- Add missing column to app_config table
ALTER TABLE app_config 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add missing columns to recommendations table (from original schema)
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS recommendation_text TEXT,
ADD COLUMN IF NOT EXISTS action TEXT,
ADD COLUMN IF NOT EXISTS why TEXT,
ADD COLUMN IF NOT EXISTS importance INTEGER CHECK (importance BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS relevance NUMERIC(3,2) CHECK (relevance BETWEEN 0 AND 1),
ADD COLUMN IF NOT EXISTS recommended_categories UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS context TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5);

-- Create indexes that were in the original schema
CREATE INDEX IF NOT EXISTS idx_coaches_active ON coaches(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, name);
CREATE INDEX IF NOT EXISTS idx_recommendations_active ON recommendations(user_id, is_active) WHERE is_active = true;

-- Update RLS policies to match original schema

-- Coaches: Anyone can view active coaches (not just all coaches)
DROP POLICY IF EXISTS "Anyone can view coaches" ON coaches;
CREATE POLICY "Anyone can view active coaches" ON coaches
  FOR SELECT USING (is_active = true OR check_auth_type() = 'service');

-- App config: Anyone can view public config
DROP POLICY IF EXISTS "Anyone can view config" ON app_config;
CREATE POLICY "Anyone can view public config" ON app_config
  FOR SELECT USING (is_public = true OR check_auth_type() = 'service');

-- Add comment explaining this migration
COMMENT ON TABLE coaches IS 'Coaches table with is_active flag for soft deletes';
COMMENT ON TABLE categories IS 'Categories with full wellness tracking configuration';
COMMENT ON TABLE app_config IS 'Application configuration with public/private flag';