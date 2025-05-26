const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMessagesTable() {
  console.log('🚀 Adding messages table via Supabase API...\n');

  // Create admin client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Since direct SQL execution isn't available, we'll create the table via API
    console.log('📝 Creating messages table...');
    
    // First, let's check if the table exists by trying to query it
    const { error: checkError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === '42P01') { // Table doesn't exist
      console.log('❌ Messages table does not exist. Please apply the SQL manually:');
      console.log('\n1. Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor');
      console.log('2. Copy the contents of scripts/add-messages-table.sql');
      console.log('3. Run the SQL in the editor\n');
      
      // Show the SQL content
      const sqlPath = path.join(__dirname, 'add-messages-table.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log('SQL to apply:\n');
      console.log('```sql');
      console.log(sql);
      console.log('```');
    } else if (!checkError) {
      console.log('✅ Messages table already exists!');
    } else {
      console.error('❌ Error checking messages table:', checkError);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

applyMessagesTable();