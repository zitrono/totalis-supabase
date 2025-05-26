import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSchemaStatus() {
  console.log('🔍 Checking schema installation status...\n');

  const tables = [
    'coaches', 'user_profiles', 'categories', 'user_categories',
    'messages', 'check_ins', 'health_cards', 'recommendations',
    'user_feedback', 'app_versions', 'user_app_versions',
    'analytics_events', 'app_config'
  ];

  let installedCount = 0;
  const missingTables: string[] = [];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (!error) {
        installedCount++;
      } else {
        missingTables.push(table);
      }
    } catch {
      missingTables.push(table);
    }
  }

  console.log(`📊 Schema Status: ${installedCount}/${tables.length} tables found\n`);

  if (installedCount === 0) {
    console.log('❌ Schema not installed yet.');
    console.log('\nTo install:');
    console.log('1. Copy the contents of: supabase/migrations/001_initial_schema.sql');
    console.log('2. Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor');
    console.log('3. Paste and run the SQL\n');
    return false;
  } else if (installedCount < tables.length) {
    console.log('⚠️  Partial installation detected.');
    console.log('\nMissing tables:', missingTables.join(', '));
    console.log('\nThis might be due to SQL errors during migration.');
    return false;
  } else {
    console.log('✅ All tables are installed!');
    
    // Check for coaches
    const { count } = await supabase
      .from('coaches')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n👥 Coaches in database: ${count || 0}`);
    
    if (!count || count === 0) {
      console.log('\nNext step: Seed coaches');
      console.log('Run: npm run seed:coaches');
    }
    
    return true;
  }
}

checkSchemaStatus()
  .then(installed => process.exit(installed ? 0 : 1))
  .catch(console.error);