import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkTables() {
  console.log('🔍 Checking tables via Supabase API...\n');

  const tables = [
    'coaches', 'user_profiles', 'categories', 'user_categories',
    'messages', 'check_ins', 'health_cards', 'recommendations',
    'user_feedback', 'app_versions', 'user_app_versions',
    'analytics_events', 'app_config'
  ];

  let existingTables = 0;
  const results: any[] = [];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        existingTables++;
        results.push({ table, status: '✅ Exists', rows: count || 0 });
      } else {
        results.push({ table, status: '❌ Missing', error: error.message });
      }
    } catch (err: any) {
      results.push({ table, status: '❌ Error', error: err.message });
    }
  }

  // Print results
  console.log('Table Status:');
  console.log('=============');
  for (const result of results) {
    if (result.status.includes('✅')) {
      console.log(`${result.status} ${result.table.padEnd(20)} (${result.rows} rows)`);
    } else {
      console.log(`${result.status} ${result.table.padEnd(20)}`);
    }
  }

  console.log(`\n📊 Summary: ${existingTables}/${tables.length} tables exist`);

  if (existingTables === 0) {
    console.log('\n❌ No tables found. The schema needs to be applied.');
    console.log('\nOptions:');
    console.log('1. Apply via SQL Editor: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor');
    console.log('2. Use the migration file: supabase/migrations/001_initial_schema.sql');
  } else if (existingTables < tables.length) {
    console.log('\n⚠️  Partial schema detected. Some tables are missing.');
  } else {
    console.log('\n✅ All tables exist! Schema is properly installed.');
    
    // Check for coaches
    const { count: coachCount } = await supabase
      .from('coaches')
      .select('*', { count: 'exact', head: true });
    
    if (!coachCount || coachCount === 0) {
      console.log('\n📌 Next step: Seed coaches');
      console.log('Run: npm run seed:coaches');
    }
  }
}

checkTables();