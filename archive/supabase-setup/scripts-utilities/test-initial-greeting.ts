import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testInitialGreeting() {
  console.log('🧪 Testing initial greeting message creation...\n');

  try {
    // Create a test user
    const testEmail = `test-greeting-${Date.now()}@example.com`;
    const { data: { user }, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'testpass123'
    });

    if (userError) {
      console.error('Failed to create test user:', userError);
      return;
    }

    console.log('✓ Created test user:', user?.id);

    // Wait a bit for the trigger to fire
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if profile was created
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user!.id)
      .single();

    console.log('✓ User profile created with coach:', profile?.coach_id);

    // Check for greeting messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError);
    } else {
      console.log(`✓ Found ${messages?.length || 0} messages`);
      
      if (messages && messages.length > 0) {
        console.log('\nMessages:');
        messages.forEach((msg, i) => {
          console.log(`${i + 1}. [${msg.role}] ${msg.content.substring(0, 100)}...`);
          if (msg.answer_options) {
            console.log(`   Options: ${JSON.stringify(msg.answer_options)}`);
          }
        });
      }
    }

    // Clean up
    if (user) {
      // Delete messages first
      await supabase.from('messages').delete().eq('user_id', user.id);
      // Delete profile
      await supabase.from('user_profiles').delete().eq('id', user.id);
      // Delete user
      await supabase.auth.admin.deleteUser(user.id);
      console.log('\n✓ Cleaned up test data');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testInitialGreeting();