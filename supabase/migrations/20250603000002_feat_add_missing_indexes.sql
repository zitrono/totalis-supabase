-- Add missing indexes for better query performance (v4.2.17)

-- Profile to coach relationship
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON profiles(coach_id);

-- User categories (note: table is actually named profile_categories)
CREATE INDEX IF NOT EXISTS idx_profile_categories_user_id ON profile_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_categories_category_id ON profile_categories(category_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Check-ins (note: table is actually named check_in_sessions, but we'll also add for potential check_ins)
CREATE INDEX IF NOT EXISTS idx_check_in_sessions_user_id ON check_in_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_check_in_sessions_category_id ON check_in_sessions(category_id);

-- Analytics events (already has indexes from previous migration)
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);