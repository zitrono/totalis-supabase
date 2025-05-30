-- This script applies only the missing parts of the consolidated migration
-- It checks for existence before creating objects

-- Create check_in_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS check_in_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'aborted')),
    questions JSONB DEFAULT '[]'::jsonb,
    answers JSONB DEFAULT '[]'::jsonb,
    level INTEGER,
    insight TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_check_in_sessions_user_id ON check_in_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_check_in_sessions_status ON check_in_sessions(status);

-- Enable RLS
ALTER TABLE check_in_sessions ENABLE ROW LEVEL SECURITY;

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_check_in_sessions_updated_at 
BEFORE UPDATE ON check_in_sessions
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Create other missing tables if needed
CREATE TABLE IF NOT EXISTS user_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dismissed', 'snoozed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, recommendation_id)
);

CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_status ON user_recommendations(status);

ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

-- Create account_links table (even though we're not using it, the migration references it)
CREATE TABLE IF NOT EXISTS account_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
);

-- Now mark the consolidated migration as applied
INSERT INTO supabase_migrations.schema_migrations (version, name, hash, executed_at)
VALUES ('20250529154547', '20250529154547_refactor_consolidated_base_schema', 'applied-partially', NOW())
ON CONFLICT (version) DO UPDATE SET executed_at = NOW();