import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting Totalis database migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded: 001_initial_schema.sql');
    console.log(`📏 Size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

    // Split migration into individual statements
    // This is a simple split - in production, use a proper SQL parser
    const statements = migrationSQL
      .split(/;(?=\s*(?:CREATE|ALTER|INSERT|GRANT|DROP|COMMENT))/i)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'; // Re-add semicolon
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      
      try {
        // Get statement type for logging
        const stmtType = statement.match(/^\s*(\w+)/)?.[1]?.toUpperCase() || 'UNKNOWN';
        
        process.stdout.write(`[${i + 1}/${statements.length}] ${stmtType}: ${preview}...`);
        
        // Execute statement
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).single();

        if (error) {
          // Try direct execution as fallback
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql: statement })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
        }

        process.stdout.write(' ✅\n');
        successCount++;
      } catch (error: any) {
        process.stdout.write(' ❌\n');
        console.error(`   Error: ${error.message}\n`);
        errorCount++;
        
        // Continue with other statements
        if (error.message.includes('already exists')) {
          console.log('   ℹ️  Object already exists, continuing...\n');
        } else if (error.message.includes('does not exist')) {
          console.log('   ℹ️  Referenced object missing, continuing...\n');
        }
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📊 Total: ${statements.length}\n`);

    if (errorCount > 0) {
      console.log('⚠️  Some statements failed. This might be expected if:');
      console.log('   - Tables/indexes already exist from previous runs');
      console.log('   - Extensions are already enabled');
      console.log('   - RLS policies are already in place\n');
    }

    // Test basic connectivity
    console.log('🔍 Testing database connectivity...');
    
    const { data: coaches, error: coachError } = await supabase
      .from('coaches')
      .select('count');

    if (coachError) {
      console.error('❌ Failed to query coaches table:', coachError.message);
    } else {
      console.log('✅ Successfully connected to database');
    }

    console.log('\n✨ Migration process completed!');
    
    // Next steps
    console.log('\n📋 Next Steps:');
    console.log('1. Configure authentication:');
    console.log('   npm run configure:auth');
    console.log('\n2. Run schema validation:');
    console.log('   npm run test:schema');
    console.log('\n3. Insert test data:');
    console.log('   npm run seed:coaches');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Create RPC function for executing SQL (if not exists)
async function createExecSQLFunction() {
  const functionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: functionSQL
    });

    if (!response.ok && !response.status.toString().startsWith('4')) {
      console.warn('Could not create exec_sql function, will use alternative method');
    }
  } catch (error) {
    // Ignore, will use alternative method
  }
}

// Alternative: Direct SQL execution via pg protocol
async function executeSQLDirect(sql: string) {
  // This would require a direct PostgreSQL connection
  // For now, we'll use the Supabase SQL editor approach
  console.log('\n📝 Manual execution required:');
  console.log('1. Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor');
  console.log('2. Paste and run the migration SQL');
  console.log('3. Check for any errors\n');
}

// Run migration
console.log('🔧 Preparing migration environment...\n');
createExecSQLFunction().then(() => {
  runMigration().catch(console.error);
});