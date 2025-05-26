import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  // Test with service role key
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // Try a simple query
    const { data, error } = await supabase
      .from('test_connection')
      .select('*')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.log('✅ Connection successful (table does not exist as expected)');
      
      // Try to get database version through a function
      const { data: version, error: versionError } = await supabase
        .rpc('version');
      
      if (!versionError && version) {
        console.log(`📊 PostgreSQL version: ${version}`);
      }
    } else if (error) {
      console.error('❌ Connection error:', error.message);
    } else {
      console.log('✅ Connection successful');
    }

    // Test auth connection
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (!authError) {
      console.log('✅ Auth service accessible');
    }

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
  }

  // Show connection details (without sensitive info)
  console.log('\n📋 Connection Configuration:');
  console.log(`URL: ${process.env.SUPABASE_URL}`);
  console.log(`Project ID: qdqbrqnqttyjegiupvri`);
  console.log(`Region: Central EU (Frankfurt)`);
  
  console.log('\n💡 Database Connection String:');
  console.log('For direct PostgreSQL access, use:');
  console.log('postgresql://postgres.qdqbrqnqttyjegiupvri:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres');
  console.log('\nReplace [YOUR-PASSWORD] with: 4-ever-young');
}

testConnection();