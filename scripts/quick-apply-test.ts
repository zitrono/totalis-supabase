import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function quickTest() {
  console.log('🚀 Quick Schema Test\n');
  
  // Try to create just the coaches table
  const createCoachesSQL = `
    CREATE TABLE IF NOT EXISTS coaches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      bio TEXT,
      photo_url TEXT,
      sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'other')),
      year_of_birth INTEGER,
      voice_id TEXT,
      voice_settings JSONB DEFAULT '{}',
      prompt TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  console.log('Attempting to create coaches table via API...\n');
  
  // Try different approaches
  console.log('Since direct SQL execution is not available through the API,');
  console.log('you need to manually apply the schema.\n');
  
  console.log('📋 Instructions:');
  console.log('1. Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor\n');
  
  console.log('2. First, run this test SQL to verify access:');
  console.log('```sql');
  console.log('SELECT current_database(), current_user;');
  console.log('```\n');
  
  console.log('3. Then run the full migration from:');
  console.log('   supabase/migrations/001_initial_schema.sql\n');
  
  console.log('4. After running, verify with:');
  console.log('```sql');
  console.log("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  console.log('```\n');
  
  // Save a minimal test SQL
  const minimalSQL = `
-- Minimal test to verify SQL execution works
-- Run this first in Supabase SQL Editor

-- Check current database
SELECT current_database(), current_user, version();

-- Create a simple test table
CREATE TABLE IF NOT EXISTS test_connection (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verify it worked
SELECT * FROM test_connection;

-- Clean up
DROP TABLE IF EXISTS test_connection;

-- If this works, proceed with the full migration
`;

  const fs = require('fs');
  fs.writeFileSync('scripts/test-sql-access.sql', minimalSQL);
  
  console.log('💡 Created test file: scripts/test-sql-access.sql');
  console.log('   Run this first to verify SQL access works.\n');
}

quickTest().catch(console.error);