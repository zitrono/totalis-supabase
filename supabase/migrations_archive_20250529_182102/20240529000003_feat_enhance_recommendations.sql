-- Enhance recommendations table for hierarchical support and expiration
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 CHECK (level IN (1, 2)),
ADD COLUMN IF NOT EXISTS parent_recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_recommendations_hierarchy 
ON recommendations(parent_recommendation_id, level) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_recommendations_expires_at 
ON recommendations(expires_at) WHERE is_active = true AND expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recommendations_user_category 
ON recommendations(user_id, category_id, level) WHERE is_active = true;

-- Add constraint to ensure second-level recommendations have a parent
ALTER TABLE recommendations
ADD CONSTRAINT recommendations_hierarchy_check CHECK (
  (level = 1 AND parent_recommendation_id IS NULL) OR
  (level = 2 AND parent_recommendation_id IS NOT NULL)
);

-- Function to automatically expire recommendations
CREATE OR REPLACE FUNCTION expire_old_recommendations()
RETURNS void AS $$
BEGIN
  UPDATE recommendations
  SET is_active = false
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get recommendation tree
CREATE OR REPLACE FUNCTION get_recommendation_tree(p_user_id UUID, p_category_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  level INTEGER,
  parent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE recommendation_tree AS (
    -- First level recommendations
    SELECT 
      r.id,
      r.title,
      r.content,
      r.level,
      r.parent_recommendation_id as parent_id,
      r.created_at,
      r.expires_at,
      r.view_count
    FROM recommendations r
    WHERE r.user_id = p_user_id 
      AND r.category_id = p_category_id
      AND r.level = 1
      AND r.is_active = true
      AND (r.expires_at IS NULL OR r.expires_at > NOW())
    
    UNION ALL
    
    -- Second level recommendations
    SELECT 
      r.id,
      r.title,
      r.content,
      r.level,
      r.parent_recommendation_id as parent_id,
      r.created_at,
      r.expires_at,
      r.view_count
    FROM recommendations r
    INNER JOIN recommendation_tree rt ON r.parent_recommendation_id = rt.id
    WHERE r.level = 2
      AND r.is_active = true
      AND (r.expires_at IS NULL OR r.expires_at > NOW())
  )
  SELECT * FROM recommendation_tree
  ORDER BY level, created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- RLS policies update
CREATE POLICY "Users can update view count on their recommendations" ON recommendations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON COLUMN recommendations.expires_at IS 'When this recommendation expires and becomes inactive';
COMMENT ON COLUMN recommendations.level IS 'Hierarchy level: 1 for main recommendations, 2 for sub-recommendations';
COMMENT ON COLUMN recommendations.parent_recommendation_id IS 'Reference to parent recommendation for level 2 items';
COMMENT ON COLUMN recommendations.view_count IS 'Number of times this recommendation has been viewed';
COMMENT ON COLUMN recommendations.last_viewed_at IS 'Last time this recommendation was viewed';