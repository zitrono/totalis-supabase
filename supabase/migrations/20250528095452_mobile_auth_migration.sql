-- Mobile App Authentication Migration
-- This migration prepares the database for direct Supabase integration from Flutter mobile app

-- 1. Ensure Google OAuth provider is configured (manual step in dashboard)
-- Note: Google OAuth configuration must be done in Supabase Dashboard under Authentication > Providers

-- 2. Create a function to handle post-authentication profile creation with Google data
CREATE OR REPLACE FUNCTION public.handle_google_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    -- Extract name from Google metadata
    INSERT INTO public.profiles (
      id,
      first_name,
      last_name,
      image_url,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'given_name', SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 1), ''),
      COALESCE(NEW.raw_user_meta_data->>'family_name', SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 2), ''),
      NEW.raw_user_meta_data->>'avatar_url',
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the existing auth trigger to handle Google OAuth data
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_google_auth_user();

-- 4. Add index for faster profile lookups by id (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- 5. Add last_seen_at column to profiles for unread message tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- 6. Create a view for mobile app dashboard data
CREATE OR REPLACE VIEW public.mobile_user_dashboard AS
SELECT 
  p.id as user_id,
  p.first_name,
  p.last_name,
  p.image_url as profile_image,
  p.coach_id,
  c.name as coach_name,
  c.photo_url as coach_image,
  COALESCE(rec_count.count, 0) as active_recommendations,
  COALESCE(msg_count.count, 0) as unread_messages,
  COALESCE(checkin_count.count, 0) as completed_checkins,
  p.created_at as member_since
FROM profiles p
LEFT JOIN coaches c ON p.coach_id = c.id
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count 
  FROM recommendations 
  WHERE user_id = p.id 
    AND is_active = true
) rec_count ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count 
  FROM messages 
  WHERE user_id = p.id 
    AND role = 'assistant' 
    AND created_at > COALESCE(p.last_seen_at, '1970-01-01'::timestamp)
) msg_count ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count 
  FROM checkins 
  WHERE user_id = p.id 
    AND status = 'completed'
) checkin_count ON true;

-- Grant access to the view
GRANT SELECT ON public.mobile_user_dashboard TO authenticated;

-- 7. Add RLS policy for mobile dashboard view (if not exists)
-- Note: This policy may already exist, so we'll skip if it does

-- 8. Create optimized view for mobile recommendations feed
CREATE OR REPLACE VIEW public.mobile_recommendations_feed AS
SELECT 
  r.id,
  r.user_id,
  r.title,
  r.recommendation_text,
  r.action,
  r.why,
  r.recommendation_type,
  r.importance,
  r.relevance,
  r.is_active,
  r.created_at,
  r.category_id,
  c.name as category_name,
  c.primary_color as category_color,
  c.icon as category_icon
FROM recommendations r
LEFT JOIN categories c ON r.category_id = c.id
WHERE r.is_active = true
ORDER BY r.importance DESC, r.created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.mobile_recommendations_feed TO authenticated;

-- 9. Create function to update last_seen_at
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET last_seen_at = NOW() 
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_last_seen() TO authenticated;

-- 10. Ensure anonymous sign-ins are enabled in auth config
-- Note: This must be configured in Supabase Dashboard under Authentication > Providers > Email

COMMENT ON VIEW public.mobile_user_dashboard IS 'Optimized view for mobile app dashboard data with aggregated counts';
COMMENT ON VIEW public.mobile_recommendations_feed IS 'Pre-joined recommendations with category data for mobile feed';
COMMENT ON FUNCTION public.update_last_seen() IS 'Updates user last seen timestamp for unread message tracking';