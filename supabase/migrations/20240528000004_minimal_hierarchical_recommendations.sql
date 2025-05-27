-- Migration: Minimal hierarchical recommendations support
-- ======================================================
-- This migration adds basic parent-child relationship only

-- 1. Ensure parent_recommendation_id column exists
-- ===============================================
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS parent_recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE;

-- Add index for efficient parent-child queries
CREATE INDEX IF NOT EXISTS idx_recommendations_parent ON recommendations(parent_recommendation_id);

-- 2. Grant permissions on recommendations table
-- ============================================
-- Ensure authenticated users can work with recommendations
GRANT SELECT, INSERT, UPDATE ON recommendations TO authenticated;

-- 3. Update comment
-- ================
COMMENT ON COLUMN recommendations.parent_recommendation_id IS 'References parent recommendation for hierarchical structure. NULL for top-level recommendations.';