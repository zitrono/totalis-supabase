import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function quickCheck() {
  const tables = ['coaches', 'user_profiles', 'categories', 'messages'];
  let found = 0;
  
  for (const table of tables) {
    try {
      await supabase.from(table).select('*').limit(0);
      found++;
    } catch {}
  }
  
  if (found === 0) {
    console.log('❌ Schema not applied yet');
  } else if (found < tables.length) {
    console.log(`⚠️  Partial schema: ${found}/${tables.length} tables`);
  } else {
    console.log('✅ Schema is applied!');
  }
}

quickCheck();