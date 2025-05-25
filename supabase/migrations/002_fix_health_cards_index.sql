-- Fix health_cards index that uses NOW() function
-- NOW() is not immutable, so we need a different approach

-- Drop the problematic index if it exists
DROP INDEX IF EXISTS idx_health_cards_active;

-- Create a simpler index without the NOW() comparison
-- The application layer will handle the expiration filtering
CREATE INDEX idx_health_cards_active ON health_cards(user_id, is_checked, expires_at) 
  WHERE is_checked = false;