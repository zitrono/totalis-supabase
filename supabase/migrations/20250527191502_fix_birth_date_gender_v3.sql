-- Fix birth date and gender handling issues

-- First, let's add missing columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Standardize gender/sex values
-- Convert old enum values to new string format
UPDATE profiles
SET sex = CASE 
  WHEN sex = 'M' THEN 'male'
  WHEN sex = 'F' THEN 'female'
  WHEN sex = 'N' OR sex = 'non_binary' THEN 'non-binary'
  WHEN sex = 'other' OR sex = 'prefer_not_to_say' THEN 'non-binary'
  ELSE sex
END
WHERE sex IS NOT NULL;

-- Update check constraint for valid sex values
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_sex_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_sex_check 
  CHECK (sex IS NULL OR sex IN ('male', 'female', 'non-binary'));

-- Create helper function to handle profile updates with proper data conversion
CREATE OR REPLACE FUNCTION update_user_profile_fixed(
  p_user_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_birth_year INT DEFAULT NULL,
  p_sex TEXT DEFAULT NULL,
  p_coach_id UUID DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Validate birth year if provided
  IF p_birth_year IS NOT NULL AND (p_birth_year < 1900 OR p_birth_year > EXTRACT(YEAR FROM CURRENT_DATE)) THEN
    RAISE EXCEPTION 'Invalid birth year: %', p_birth_year;
  END IF;
  
  -- Validate sex if provided  
  IF p_sex IS NOT NULL AND p_sex NOT IN ('male', 'female', 'non-binary') THEN
    -- Try to convert old format
    IF p_sex = 'M' THEN
      p_sex := 'male';
    ELSIF p_sex = 'F' THEN
      p_sex := 'female';
    ELSIF p_sex = 'N' THEN
      p_sex := 'non-binary';
    ELSE
      RAISE EXCEPTION 'Invalid sex value: %. Must be male, female, or non-binary', p_sex;
    END IF;
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET 
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    phone_number = COALESCE(p_phone, phone_number),
    year_of_birth = COALESCE(p_birth_year, year_of_birth),
    sex = COALESCE(p_sex, sex),
    coach_id = COALESCE(p_coach_id, coach_id),
    image_url = COALESCE(p_image_url, image_url),
    updated_at = NOW()
  WHERE id = v_user_id
  RETURNING jsonb_build_object(
    'user_id', id,
    'id', id,
    'name', name,
    'email', email,
    'phone_number', phone_number,
    'year_of_birth', year_of_birth,
    'birth_year', year_of_birth, -- Alias for compatibility
    'sex', sex,
    'coach_id', coach_id,
    'image_url', image_url
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    -- Create profile if it doesn't exist
    INSERT INTO profiles (
      id, name, email, phone_number, year_of_birth, sex, coach_id, image_url
    ) VALUES (
      v_user_id, p_name, p_email, p_phone, p_birth_year, p_sex, p_coach_id, p_image_url
    )
    RETURNING jsonb_build_object(
      'user_id', id,
      'id', id,
      'name', name,
      'email', email,
      'phone_number', phone_number,
      'year_of_birth', year_of_birth,
      'birth_year', year_of_birth, -- Alias for compatibility
      'sex', sex,
      'coach_id', coach_id,
      'image_url', image_url
    ) INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$;

-- Create view to provide consistent profile data
CREATE OR REPLACE VIEW user_profiles_normalized AS
SELECT 
  id as user_id,
  id,
  name,
  email,
  phone_number,
  year_of_birth,
  year_of_birth as birth_year, -- Alias for app compatibility
  CASE 
    WHEN sex IN ('male', 'female', 'non-binary') THEN sex
    WHEN sex = 'M' THEN 'male'
    WHEN sex = 'F' THEN 'female'
    WHEN sex = 'N' THEN 'non-binary'
    ELSE 'non-binary'
  END as gender,
  sex as gender_raw, -- Keep original value
  coach_id,
  image_url,
  created_at,
  updated_at,
  metadata
FROM profiles;

-- Grant access to the view
GRANT SELECT ON user_profiles_normalized TO authenticated;

-- Create function to convert birth year to ISO date string (for legacy compatibility)
CREATE OR REPLACE FUNCTION year_to_birth_date_string(p_year INT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_year IS NULL THEN
    RETURN NULL;
  END IF;
  -- Return January 1st of the given year in ISO format
  RETURN p_year::TEXT || '-01-01T00:00:00.000Z';
END;
$$;

-- Create conversion function for the app to use
CREATE OR REPLACE FUNCTION convert_sex_enum_to_string(p_sex TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE 
    WHEN p_sex = 'M' THEN 'male'
    WHEN p_sex = 'F' THEN 'female'
    WHEN p_sex = 'N' THEN 'non-binary'
    ELSE COALESCE(p_sex, 'non-binary')
  END;
END;
$$;

COMMENT ON FUNCTION update_user_profile_fixed IS 'Updates user profile with proper data type conversion and validation';
COMMENT ON VIEW user_profiles_normalized IS 'Provides normalized view of user profiles with consistent data types';
COMMENT ON FUNCTION year_to_birth_date_string IS 'Converts birth year to ISO date string for legacy app compatibility';
COMMENT ON FUNCTION convert_sex_enum_to_string IS 'Converts old sex enum values to new string format';