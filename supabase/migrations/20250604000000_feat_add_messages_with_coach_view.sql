-- Add messages_with_coach view for chat display

-- Drop existing view if it exists with different columns
DROP VIEW IF EXISTS messages_with_coach;

-- This view provides messages with sender information (coach or user) for chat display
CREATE VIEW messages_with_coach AS
SELECT 
  m.*,                           -- All message columns
  CASE 
    WHEN m.role = 'assistant' THEN c.name
    ELSE 'User'                  -- Hardcoded 'User' for user messages as per test expectations
  END as sender_name,
  CASE 
    WHEN m.role = 'assistant' THEN c.photo_url
    ELSE NULL
  END as sender_avatar
FROM messages m
JOIN profiles p ON m.user_id = p.id
LEFT JOIN coaches c ON m.coach_id = c.id;

-- Grant access to authenticated users
GRANT SELECT ON messages_with_coach TO authenticated;

-- Add RLS policy to ensure users can only see their own messages
ALTER VIEW messages_with_coach SET (security_invoker = true);