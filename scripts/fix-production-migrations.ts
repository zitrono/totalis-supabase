#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'supabase_migrations' }
});

async function fixMigrations() {
  console.log('🔧 Fixing production migration history...');

  // First, get current migrations
  const { data: migrations, error: fetchError } = await supabase
    .from('schema_migrations')
    .select('*')
    .order('version');

  if (fetchError) {
    console.error('Failed to fetch migrations:', fetchError);
    return;
  }

  console.log(`Found ${migrations?.length || 0} existing migrations`);

  // Update old migrations to be marked as executed
  const oldMigrations = [
    '20240526000000', '20240526000001', '20240526000002', '20240527000000',
    '20240528000000', '20240528000004', '20240529000001', '20240529000002',
    '20240529000003', '20240529000004', '20240529000005', '20240529000006',
    '20240529000007', '20240529000008', '20250526120917', '20250527000000',
    '20250527000001', '20250527000002', '20250527000003', '20250527000004',
    '20250527000006', '20250527182540', '20250527184018', '20250527185230',
    '20250527190501', '20250527191502', '20250528095452', '20250528150000',
    '20250528160000', '20250528161000', '20250528170000', '20250528171000',
    '20250528172000', '20250528172603', '20250528173000', '20250528180000',
    '20250528180133', '20250528183000', '20250528185000', '20250528190000',
    '20250528191000', '20250528192000', '20250529142736'
  ];

  // Update executed_at for old migrations
  const { error: updateError } = await supabase
    .from('schema_migrations')
    .update({ executed_at: new Date().toISOString() })
    .in('version', oldMigrations);

  if (updateError) {
    console.error('Failed to update old migrations:', updateError);
  } else {
    console.log('✅ Updated old migrations as executed');
  }

  // Insert consolidated migration as already applied
  const { error: insertError } = await supabase
    .from('schema_migrations')
    .upsert({
      version: '20250529154547',
      name: '20250529154547_refactor_consolidated_base_schema',
      hash: 'consolidated',
      executed_at: new Date().toISOString()
    }, { onConflict: 'version' });

  if (insertError) {
    console.error('Failed to insert consolidated migration:', insertError);
  } else {
    console.log('✅ Marked consolidated migration as applied');
  }

  console.log('✅ Migration history fixed!');
}

fixMigrations().catch(console.error);