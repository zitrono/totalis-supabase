
-- Quick test migration (subset for testing)
-- Run this first to verify connectivity

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create coaches table only
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Daniel as default coach
INSERT INTO coaches (name, bio, is_active) 
VALUES ('Daniel', 'Your default wellness coach', true)
ON CONFLICT DO NOTHING;

-- Check result
SELECT * FROM coaches;
