#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  console.error('SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_KEY:', supabaseKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('📋 Listing tables in production Supabase...\n');

  const { data, error } = await supabase
    .rpc('query', {
      query: `
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `
    });

  if (error) {
    // Try alternative approach
    const { data: tables, error: altError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (altError) {
      console.error('Failed to list tables:', altError);
      
      // List known tables based on our schema
      console.log('Known tables from our migrations:');
      const knownTables = [
        'profiles', 'coaches', 'categories', 'profile_categories',
        'user_categories', 'messages', 'recommendations',
        'app_config', 'audio_transcriptions'
      ];
      knownTables.forEach(table => console.log(`- ${table}`));
    } else {
      console.log('Tables in production:');
      tables?.forEach(t => console.log(`- ${t.table_name}`));
    }
  } else {
    console.log('Tables in production:');
    data?.forEach((row: any) => console.log(`- ${row.tablename}`));
  }
}

listTables().catch(console.error);