import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

console.log('🚀 Totalis Database Schema Setup\n');

const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

console.log('📋 Schema Migration Instructions:\n');

console.log('1. Open Supabase SQL Editor:');
console.log(`   https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor\n`);

console.log('2. Copy the migration SQL from:');
console.log(`   ${migrationPath}\n`);

console.log('3. Paste and execute in the SQL editor\n');

console.log('4. Expected Results:');
console.log('   - 13 tables created');
console.log('   - Multiple indexes created');
console.log('   - RLS policies enabled');
console.log('   - 2 views created');
console.log('   - 5 functions created');
console.log('   - Triggers activated\n');

console.log('5. Verify Installation:');
console.log('   Run these queries to verify:\n');

const verificationQueries = `
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check coaches table
SELECT * FROM coaches;

-- Check app_config
SELECT * FROM app_config;

-- Test anonymous user creation (in a transaction)
BEGIN;
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), null);
-- Should see a user_profile created
SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 1;
ROLLBACK;
`;

fs.writeFileSync(
  path.join(process.cwd(), 'scripts', 'verify-schema.sql'),
  verificationQueries
);

console.log('   Verification queries saved to: scripts/verify-schema.sql\n');

// Also create a shorter version for quick testing
const quickMigration = `
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
`;

fs.writeFileSync(
  path.join(process.cwd(), 'scripts', 'quick-test.sql'),
  quickMigration
);

console.log('6. Quick Test:');
console.log('   For a quick connectivity test, use: scripts/quick-test.sql\n');

console.log('7. Configure Authentication:');
console.log('   After schema is created, run:');
console.log('   npm run configure:auth\n');

console.log('📝 Note: The schema includes:');
console.log('   - User feedback table for ratings and bug reports');
console.log('   - App version tracking for update management');
console.log('   - Analytics events for usage tracking');
console.log('   - Health cards table (improved recommendations)');
console.log('   - Dedicated check_ins table for better tracking\n');

console.log('✅ Schema files are ready for manual application!');