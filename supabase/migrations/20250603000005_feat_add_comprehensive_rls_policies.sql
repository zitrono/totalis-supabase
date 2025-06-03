-- Enable RLS on all user-data tables (v4.2.19)

-- Note: Most tables already have RLS enabled from base schema migration
-- Only enable for tables that don't have it yet

-- Analytics events table was created in our earlier migration
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Analytics events: Add RLS policies for our new table
DROP POLICY IF EXISTS "Users can insert own analytics" ON analytics_events;
CREATE POLICY "Users can insert own analytics" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own analytics" ON analytics_events;
CREATE POLICY "Users can view own analytics" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- Note: All other tables (profiles, messages, profile_categories, recommendations) 
-- already have RLS policies from the base schema migration (20250529154547_refactor_consolidated_base_schema.sql)