import { TotalisTestClient } from '../index';

export async function runNewUserScenario(client: TotalisTestClient) {
  console.log('\n🧪 Running New User Scenario...\n');

  try {
    // Step 1: Sign in with test account
    console.log('1. Signing in with test account...');
    const authResult = await client.signInWithEmail('test1@totalis.app', 'Test123!@#');
    console.log(`   ✓ User authenticated: ${authResult.user.id}`);

    // Step 2: Profile is created automatically by trigger
    console.log('\n2. Creating user profile...');
    const profileData = {
      name: 'Test User',
      dateOfBirth: new Date('1990-01-15'),
      sex: 'male' as const
    };
    const profile = await client.createUserProfile(profileData);
    console.log(`   ✓ Profile created: ${profile.name}`);
    console.log(`   ✓ Default coach assigned: ${profile.coach_id}`);

    // Step 3: Get initial messages
    console.log('\n3. Getting initial coach greeting...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for greeting
    const messages = await client.getMessages(5);
    console.log(`   ✓ Received ${messages.length} messages`);
    if (messages.length > 0) {
      console.log(`   ✓ First message: "${messages[0].content.substring(0, 50)}..."`);
    }

    // Step 4: Check for initial check-in proposal
    console.log('\n4. Checking for check-in proposal...');
    const hasCheckInProposal = messages.some(m => 
      m.content.toLowerCase().includes('check-in') || 
      m.content.toLowerCase().includes('health')
    );
    console.log(`   ${hasCheckInProposal ? '✓' : '✗'} Check-in proposal found`);

    // Step 5: Start general check-in
    console.log('\n5. Starting general check-in...');
    const checkIn = await client.startCheckIn();
    console.log(`   ✓ Check-in started with ${checkIn.questions.length} questions`);

    // Step 6: Answer questions
    console.log('\n6. Answering check-in questions...');
    for (let i = 0; i < checkIn.questions.length; i++) {
      const question = checkIn.questions[i];
      let answer: any;
      
      if (question.type === 'radio') {
        answer = question.options[0];
      } else if (question.type === 'checkbox') {
        answer = [question.options[0]];
      }

      await client.answerQuestion(checkIn.id, i, answer);
      console.log(`   ✓ Answered: "${question.question}"`);
    }

    // Step 7: Complete check-in
    console.log('\n7. Completing check-in...');
    const completedCheckIn = await client.completeCheckIn(checkIn.id);
    console.log(`   ✓ Check-in completed`);
    console.log(`   ✓ Health level: ${completedCheckIn.level}%`);
    console.log(`   ✓ Insight: "${completedCheckIn.insight}"`);

    // Step 8: Get generated cards
    console.log('\n8. Getting health cards...');
    const cards = await client.getActiveCards();
    console.log(`   ✓ Generated ${cards.length} health cards`);
    
    for (const card of cards.slice(0, 3)) {
      console.log(`   - Type ${card.type}: "${card.title}"`);
    }

    console.log('\n✅ New User Scenario completed successfully!\n');

    return {
      user: authResult.user,
      profile,
      checkIn: completedCheckIn,
      cards
    };

  } catch (error) {
    console.error('\n❌ New User Scenario failed:', error);
    throw error;
  }
}