import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSchema() {
  console.log('🔍 Checking user_profiles table schema...\n');

  // Try to insert a test record to see what columns exist
  const testData = {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Test',
    year_of_birth: 1990,
    sex: 'male',
    coach_id: null
  };

  const { error } = await supabase
    .from('user_profiles')
    .insert(testData);

  if (error) {
    console.log('Insert error (expected):', error.message);
    console.log('\nThis suggests the columns are:');
    console.log('- id');
    console.log('- name');
    console.log('- year_of_birth (not date_of_birth)');
    console.log('- sex');
    console.log('- coach_id');
  }

  // Try to select to confirm
  const { data, error: selectError } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);

  if (!selectError && data) {
    console.log('\nSample record structure:');
    console.log(JSON.stringify(data[0] || {}, null, 2));
  }
}

checkSchema();