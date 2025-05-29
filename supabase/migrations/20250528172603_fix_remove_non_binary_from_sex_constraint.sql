-- Remove 'non-binary' option from sex field constraint

-- First update any existing 'non-binary' values to NULL
UPDATE profiles
SET sex = NULL
WHERE sex = 'non-binary';

UPDATE coaches  
SET sex = NULL
WHERE sex = 'non-binary';

-- Drop and recreate the constraint to only allow 'male' and 'female'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_sex_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_sex_check 
  CHECK (sex IS NULL OR sex IN ('male', 'female'));

-- Update the conversion function to handle non-binary -> NULL
CREATE OR REPLACE FUNCTION convert_sex_enum_to_string(p_sex TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE 
    WHEN p_sex = 'M' THEN 'male'
    WHEN p_sex = 'F' THEN 'female'
    WHEN p_sex IN ('N', 'non-binary', 'non_binary') THEN NULL
    WHEN p_sex IN ('male', 'female') THEN p_sex
    ELSE NULL
  END;
END;
$$;

-- Update the profile update function to validate only male/female
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
  IF p_sex IS NOT NULL AND p_sex NOT IN ('male', 'female') THEN
    -- Try to convert old format
    IF p_sex = 'M' THEN
      p_sex := 'male';
    ELSIF p_sex = 'F' THEN
      p_sex := 'female';
    ELSE
      -- Set to NULL for any other value
      p_sex := NULL;
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

-- Update the normalized view to handle non-binary -> NULL
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
    WHEN sex IN ('male', 'female') THEN sex
    WHEN sex = 'M' THEN 'male'
    WHEN sex = 'F' THEN 'female'
    ELSE NULL -- Convert any other value to NULL
  END as gender,
  sex as gender_raw, -- Keep original value
  coach_id,
  image_url,
  created_at,
  updated_at,
  metadata
FROM profiles;

-- Re-grant access to the view
GRANT SELECT ON user_profiles_normalized TO authenticated;

COMMENT ON FUNCTION update_user_profile_fixed IS 'Updates user profile with validation - only allows male/female for sex field';