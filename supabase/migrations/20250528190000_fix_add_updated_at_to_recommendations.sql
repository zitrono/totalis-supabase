-- Add missing updated_at column to recommendations table
-- The trigger update_recommendations_updated_at expects this column but it was missing

ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to have updated_at same as created_at
UPDATE recommendations 
SET updated_at = created_at 
WHERE updated_at IS NULL;