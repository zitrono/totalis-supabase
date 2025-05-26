import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testHealthCardCreation() {
  console.log('🧪 Testing health card creation with service role...\n');

  try {
    // Create a test user
    const { data: { user }, error: userError } = await supabase.auth.admin.createUser({
      email: `test-health-cards-${Date.now()}@example.com`,
      password: 'testpass123'
    });

    if (userError) {
      console.error('Failed to create test user:', userError);
      return;
    }

    console.log('✓ Created test user:', user?.id);

    // Try to create a health card using service role
    const { data: card, error: cardError } = await supabase
      .from('health_cards')
      .insert({
        user_id: user!.id,
        category_id: null,
        checkin_id: null,
        type: 1,
        title: 'Test Health Card',
        content: 'This is a test card created by service role',
        importance: 5,
        is_checked: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (cardError) {
      console.error('❌ Failed to create health card:', cardError);
      console.log('\nThis confirms the RLS policy needs to be fixed.');
      console.log('Please apply the fix manually in the Supabase dashboard.');
    } else {
      console.log('✅ Successfully created health card:', card?.id);
      console.log('The RLS policy has been fixed!');
    }

    // Clean up
    if (user) {
      await supabase.auth.admin.deleteUser(user.id);
      console.log('✓ Cleaned up test user');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testHealthCardCreation();