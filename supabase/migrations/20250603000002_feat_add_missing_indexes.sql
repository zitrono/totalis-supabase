-- Add missing indexes for better query performance (v4.2.17)

-- Profile to coach relationship
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON profiles(coach_id);

-- User categories (note: table is actually named profile_categories)
CREATE INDEX IF NOT EXISTS idx_profile_categories_user_id ON profile_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_categories_category_id ON profile_categories(category_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Check-ins (these indexes will be created with the checkins table in a later migration)
-- Commented out as the table doesn't exist yet at this point
-- CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
-- CREATE INDEX IF NOT EXISTS idx_checkins_category_id ON checkins(category_id);

-- Analytics events (already has indexes from previous migration)
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);