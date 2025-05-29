-- Add last_login column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN profiles.last_login IS 'Timestamp of the user''s last login to the application';