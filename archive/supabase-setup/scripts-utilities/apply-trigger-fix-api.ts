import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function applyTriggerFix() {
  console.log('🔧 Applying trigger fix via API...\n');

  // First, let's try to disable the existing trigger
  console.log('1. Attempting to disable existing trigger...');
  
  try {
    // We can't execute arbitrary SQL via the API, but we can test if the issue is permissions
    // Let's first check if we can create a user without the trigger
    
    // Create a function that executes SQL (if it doesn't exist)
    const createExecFunction = `
      CREATE OR REPLACE FUNCTION exec_sql(query text)
      RETURNS void AS $$
      BEGIN
        EXECUTE query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    console.log('Unfortunately, we cannot execute arbitrary SQL via the Supabase API.');
    console.log('The trigger fix must be applied through one of these methods:\n');
    
    console.log('Option 1: Supabase Dashboard (Recommended)');
    console.log('=========================================');
    console.log('1. Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor');
    console.log('2. Copy the SQL from: scripts/fix-user-trigger.sql');
    console.log('3. Paste and run in the SQL editor\n');
    
    console.log('Option 2: Direct PostgreSQL Connection');
    console.log('=====================================');
    console.log('1. Install PostgreSQL client: brew install postgresql');
    console.log('2. Run this command:');
    console.log(`   psql "postgresql://postgres.qdqbrqnqttyjegiupvri:4-ever-young-@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" < scripts/fix-user-trigger.sql\n`);
    
    console.log('Option 3: Temporary Workaround');
    console.log('==============================');
    console.log('Disable the trigger temporarily:');
    console.log('```sql');
    console.log('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
    console.log('```\n');
    
    console.log('Then handle profile creation in the application code.\n');
    
    // Let's test if we can at least check the current state
    console.log('Checking current database state...');
    
    const { count: coachCount } = await supabase
      .from('coaches')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✓ Coaches in database: ${coachCount}`);
    
    const { count: profileCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✓ User profiles in database: ${profileCount}`);
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

applyTriggerFix();