-- Remove anonymous user support infrastructure
-- This migration cleans up any remaining anonymous-specific elements

-- Note: These items were already removed from the consolidated migration
-- This migration ensures cleanup if upgrading from older schema

-- Drop the account_links table if it exists (used for anonymous->permanent account migration)
DROP TABLE IF EXISTS account_links CASCADE;

-- Drop the auth_type enum and check_auth_type function if they exist
DROP FUNCTION IF EXISTS check_auth_type() CASCADE;
DROP TYPE IF EXISTS auth_type CASCADE;

-- Drop the create_profile_if_needed function if it exists (no longer needed with trigger)
DROP FUNCTION IF EXISTS create_profile_if_needed() CASCADE;

-- Update profile creation to remove anonymous user handling
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple update without auth type checking
  UPDATE profiles 
  SET 
    last_seen_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate simplified analytics function without auth type
CREATE OR REPLACE FUNCTION log_analytics_event(
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'::jsonb
) RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log for authenticated users
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO analytics_events (
      user_id,
      event_type,
      event_data,
      created_at
    ) VALUES (
      auth.uid(),
      p_event_type,
      p_event_data,
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Clean up any remaining anonymous user data in profiles
UPDATE profiles 
SET metadata = metadata - 'anonymous' - 'auth_type'
WHERE metadata ? 'anonymous' OR metadata ? 'auth_type';

-- Add index on profiles for better performance with authenticated queries
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Update comments to reflect authenticated-only architecture
COMMENT ON TABLE profiles IS 'User profiles - automatically created on signup via trigger';
COMMENT ON FUNCTION create_profile_on_signup() IS 'Creates profile automatically when user signs up - no manual call needed';

-- Revoke unnecessary permissions that were needed for anonymous users
REVOKE ALL ON FUNCTION update_last_seen() FROM anon;
REVOKE ALL ON FUNCTION log_analytics_event(text, jsonb) FROM anon;

-- Grant appropriate permissions for authenticated users
GRANT EXECUTE ON FUNCTION update_last_seen() TO authenticated;
GRANT EXECUTE ON FUNCTION log_analytics_event(text, jsonb) TO authenticated;