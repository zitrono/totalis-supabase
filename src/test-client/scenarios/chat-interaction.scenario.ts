import { TotalisTestClient } from '../index';

export async function runChatInteractionScenario(client: TotalisTestClient) {
  console.log('\n🧪 Running Chat Interaction Scenario...\n');

  try {
    // Ensure user is authenticated
    const user = await client.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated first');
    }

    // Step 1: Send initial message
    console.log('1. Sending initial message...');
    await client.sendMessage('Hello! I want to improve my overall health.');
    console.log('   ✓ Message sent');

    // Wait for AI response
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Get conversation history
    console.log('\n2. Getting conversation history...');
    let messages = await client.getMessages(10);
    const aiResponse = messages[messages.length - 1];
    console.log(`   ✓ AI response: "${aiResponse.content.substring(0, 60)}..."`);

    // Step 3: Check if AI provided options
    if (aiResponse.answer_options) {
      console.log('\n3. AI provided answer options:');
      console.log(`   ✓ Type: ${aiResponse.answer_options.type}`);
      console.log(`   ✓ Options: ${aiResponse.answer_options.options.join(', ')}`);
      
      // Respond with one of the options
      const selectedOption = aiResponse.answer_options.options[0];
      await client.sendMessage(selectedOption);
      console.log(`   ✓ Selected: "${selectedOption}"`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 4: Ask about specific health concern
    console.log('\n4. Asking about specific health concern...');
    await client.sendMessage('I\'ve been having trouble sleeping lately. What should I do?');
    console.log('   ✓ Sleep concern message sent');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Get updated conversation
    console.log('\n5. Getting AI advice...');
    messages = await client.getMessages(20);
    const sleepAdvice = messages[messages.length - 1];
    console.log(`   ✓ AI advice: "${sleepAdvice.content.substring(0, 80)}..."`);

    // Step 6: Ask about check-ins
    console.log('\n6. Asking about check-ins...');
    await client.sendMessage('Should I do a health check-in?');
    console.log('   ✓ Check-in inquiry sent');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 7: Review full conversation
    console.log('\n7. Reviewing full conversation...');
    const fullHistory = await client.getChatHistory();
    console.log(`   ✓ Total messages: ${fullHistory.length}`);
    
    // Count message types
    const messageTypes = fullHistory.reduce((acc, msg) => {
      acc[msg.role] = (acc[msg.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   ✓ Message breakdown:');
    Object.entries(messageTypes).forEach(([role, count]) => {
      console.log(`     - ${role}: ${count}`);
    });

    // Step 8: Test coach context
    console.log('\n8. Testing coach context...');
    const profile = await client.getUserProfile();
    const coach = await client.getCategoryService().getCoachDetails(profile!.coach_id);
    console.log(`   ✓ Current coach: ${coach.name}`);
    console.log(`   ✓ Coach prompt preview: "${coach.prompt.substring(0, 50)}..."`);

    console.log('\n✅ Chat Interaction Scenario completed successfully!\n');

    return {
      totalMessages: fullHistory.length,
      messageTypes,
      lastAIResponse: sleepAdvice,
      coach
    };

  } catch (error) {
    console.error('\n❌ Chat Interaction Scenario failed:', error);
    throw error;
  }
}