-- Ensure app_config table exists (v4.2.17)
-- This is a workaround for preview environments not applying base migrations correctly

CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration if not exists
INSERT INTO app_config (key, value, description, is_public) VALUES
  ('default_coach', 
   '{"default_coach_id": "00000000-0000-0000-0000-000000000001"}'::jsonb, 
   'Default coach for new users', 
   false),
  ('ai_config', 
   '{"model": "claude-3-sonnet", "temperature": 0.7, "max_tokens": 1000}'::jsonb, 
   'AI model configuration', 
   false),
  ('rate_limits', 
   '{"audio_transcriptions_per_minute": 10, "messages_per_hour": 100}'::jsonb, 
   'Rate limiting configuration', 
   false),
  ('features', 
   '{"voice_enabled": true, "checkins_enabled": true, "recommendations_enabled": true}'::jsonb, 
   'Feature flags', 
   true)
ON CONFLICT (key) DO NOTHING;