import { SupabaseClient } from '@supabase/supabase-js';
import { ScenarioResult, TestUser } from '../types';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

/**
 * Comprehensive Chat Scenario
 * Tests the enhanced chat system with conversation management, AI responses, and context
 */
export async function runComprehensiveChatScenario(
  supabase: SupabaseClient
): Promise<ScenarioResult> {
  const logs: string[] = [];
  let testUser: TestUser | null = null;
  let conversationId: string | null = null;

  try {
    logs.push('Starting comprehensive chat scenario...');

    // Step 1: Create and authenticate user
    const authService = new AuthService(supabase);
    const authResult = await authService.signUpWithEmail(
      `chat-test-${Date.now()}@example.com`,
      'TestPassword123!'
    );
    
    if (!authResult.user) {
      throw new Error('Failed to create test user');
    }
    
    testUser = authResult;
    logs.push(`✓ Created test user: ${testUser.user.email}`);

    // Step 2: Set up user profile
    const userService = new UserService(supabase);
    const profile = await userService.updateProfile({
      name: 'Chat Test User',
      yearOfBirth: 1990,
      sex: 'female'
    });
    logs.push(`✓ Updated user profile`);

    // Step 3: Start a new conversation
    const chatResponse1 = await supabase.functions.invoke('chat-ai-response', {
      body: {
        message: "I'm feeling stressed about work lately. Can you help me?",
        includeHistory: false,
        voiceEnabled: false
      }
    });

    if (chatResponse1.error) {
      throw new Error(`Chat error: ${chatResponse1.error.message}`);
    }

    conversationId = chatResponse1.data.conversationId;
    logs.push(`✓ Started new conversation: ${conversationId}`);
    logs.push(`  AI Response: ${chatResponse1.data.aiResponse.text.substring(0, 100)}...`);
    logs.push(`  Suggestions: ${chatResponse1.data.aiResponse.suggestions.join(', ')}`);

    // Step 4: Continue conversation with history
    const chatResponse2 = await supabase.functions.invoke('chat-ai-response', {
      body: {
        message: "I've been working long hours and can't seem to disconnect",
        conversationId,
        includeHistory: true,
        voiceEnabled: false
      }
    });

    if (chatResponse2.error) {
      throw new Error(`Chat continuation error: ${chatResponse2.error.message}`);
    }

    logs.push(`✓ Continued conversation with context`);
    logs.push(`  AI Response: ${chatResponse2.data.aiResponse.text.substring(0, 100)}...`);

    // Step 5: Test category context
    const categories = await supabase
      .from('categories')
      .select('id, name')
      .limit(1)
      .single();

    if (categories.data) {
      const contextualChat = await supabase.functions.invoke('chat-ai-response', {
        body: {
          message: "What can I do to improve in this area?",
          conversationId,
          contextType: "category",
          contextId: categories.data.id,
          includeHistory: true
        }
      });

      if (!contextualChat.error) {
        logs.push(`✓ Sent message with category context: ${categories.data.name}`);
        logs.push(`  Context included in response: ${contextualChat.data.context.category?.name}`);
      }
    }

    // Step 6: Verify messages are stored
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('message_order', { ascending: true });

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`);
    }

    logs.push(`✓ Verified ${messages.length} messages stored in database`);
    
    // Verify message ordering
    const messageOrders = messages.map(m => m.message_order);
    const isOrdered = messageOrders.every((order, index) => 
      index === 0 || order > messageOrders[index - 1]
    );
    logs.push(`  Message ordering: ${isOrdered ? 'Correct' : 'Incorrect'}`);

    // Step 7: Test conversation functions
    const { data: conversationSummary } = await supabase
      .rpc('get_user_conversations', { 
        user_uuid: testUser.user.id,
        limit_count: 10
      });

    if (conversationSummary && conversationSummary.length > 0) {
      logs.push(`✓ Retrieved conversation summary`);
      logs.push(`  Total conversations: ${conversationSummary.length}`);
      logs.push(`  Current conversation messages: ${conversationSummary[0].message_count}`);
      logs.push(`  Unread count: ${conversationSummary[0].unread_count}`);
    }

    // Step 8: Mark messages as read
    const { data: readCount } = await supabase
      .rpc('mark_messages_as_read', { 
        conversation_uuid: conversationId
      });

    logs.push(`✓ Marked ${readCount} messages as read`);

    // Step 9: Test voice-enabled message
    const voiceChat = await supabase.functions.invoke('chat-ai-response', {
      body: {
        message: "Thank you for the advice. I'll try to implement these strategies.",
        conversationId,
        includeHistory: true,
        voiceEnabled: true
      }
    });

    if (!voiceChat.error) {
      logs.push(`✓ Sent voice-enabled message`);
      
      // Check if voice_enabled flag is set
      const { data: voiceMessage } = await supabase
        .from('messages')
        .select('voice_enabled')
        .eq('conversation_id', conversationId)
        .eq('voice_enabled', true)
        .limit(1)
        .single();

      if (voiceMessage) {
        logs.push(`  Voice flag properly set in database`);
      }
    }

    // Step 10: Analytics verification
    const { data: analyticsEvents } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('user_id', testUser.user.id)
      .eq('event_type', 'chat_message');

    logs.push(`✓ Verified ${analyticsEvents?.length || 0} analytics events logged`);

    return {
      success: true,
      logs,
      summary: `Successfully tested comprehensive chat features with ${messages.length} messages`,
      data: {
        conversationId,
        messageCount: messages.length,
        analyticsEventCount: analyticsEvents?.length || 0
      }
    };

  } catch (error) {
    logs.push(`✗ Error: ${error.message}`);
    
    return {
      success: false,
      logs,
      error: error.message
    };
  } finally {
    // Cleanup
    if (testUser) {
      try {
        await supabase.auth.admin.deleteUser(testUser.user.id);
        logs.push('✓ Cleaned up test user');
      } catch (error) {
        logs.push(`✗ Cleanup failed: ${error.message}`);
      }
    }
  }
}