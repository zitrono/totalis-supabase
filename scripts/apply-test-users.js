const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyTestUsers() {
  console.log('🚀 Applying test users via Supabase API...\n');

  // Create admin client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'create-test-users.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    // Execute the SQL
    console.log('📝 Executing SQL to create test users...');
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });

    if (error) {
      // Try alternative approach - execute statements one by one
      console.log('⚠️  Direct SQL execution failed, trying alternative approach...');
      
      // Create test users directly via auth admin API
      const testUsers = [
        { email: 'test1@totalis.test', name: 'Test User 1' },
        { email: 'test2@totalis.test', name: 'Test User 2' },
        { email: 'test3@totalis.test', name: 'Test User 3' },
        { email: 'test4@totalis.test', name: 'Test User 4' },
        { email: 'test5@totalis.test', name: 'Test User 5' }
      ];

      for (const user of testUsers) {
        try {
          // Check if user exists
          const { data: existingUser } = await supabase.auth.admin.listUsers();
          const userExists = existingUser?.users?.some(u => u.email === user.email);

          if (!userExists) {
            console.log(`Creating user: ${user.email}`);
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
              email: user.email,
              password: 'Test123!@#',
              email_confirm: true,
              user_metadata: {
                display_name: user.name
              }
            });

            if (createError) {
              console.error(`  ❌ Error creating ${user.email}:`, createError.message);
            } else {
              console.log(`  ✅ Created ${user.email}`);
              
              // Update profile (using only existing columns)
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  id: newUser.user.id,
                  metadata: {
                    created_at: new Date().toISOString(),
                    email: user.email,
                    display_name: user.name
                  }
                });
                
              if (profileError) {
                console.error(`  ⚠️  Failed to update profile:`, profileError.message);
              }
            }
          } else {
            console.log(`  ℹ️  User ${user.email} already exists`);
          }
        } catch (err) {
          console.error(`  ❌ Error with ${user.email}:`, err.message);
        }
      }
    } else {
      console.log('✅ SQL executed successfully!');
    }

    // Verify users were created
    console.log('\n📊 Verifying test users...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, metadata')
      .not('metadata->email', 'is', null)
      .like('metadata->>email', '%@totalis.test');

    if (profileError) {
      console.error('Failed to verify users:', profileError);
    } else {
      console.log('\nTest users in database:');
      profiles.forEach(profile => {
        const email = profile.metadata?.email || 'unknown';
        const name = profile.metadata?.display_name || 'unknown';
        console.log(`  - ${email} (${name})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

applyTestUsers();