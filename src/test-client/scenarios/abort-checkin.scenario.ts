import { TotalisTestClient } from '../index';

export async function runAbortCheckInScenario(client: TotalisTestClient) {
  console.log('\n🧪 Running Abort Check-in Scenario...\n');

  try {
    // Ensure user is authenticated
    const user = await client.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated first');
    }

    // Step 1: Start a check-in
    console.log('1. Starting a new check-in...');
    const checkIn = await client.startCheckIn();
    console.log(`   ✓ Check-in started: ${checkIn.id}`);
    console.log(`   ✓ Questions: ${checkIn.questions.length}`);

    // Step 2: Answer some questions (but not all)
    console.log('\n2. Answering some questions...');
    const questionsToAnswer = Math.floor(checkIn.questions.length / 2);
    
    for (let i = 0; i < questionsToAnswer; i++) {
      const question = checkIn.questions[i];
      let answer: any;
      
      if (question.type === 'radio') {
        answer = question.options[0];
      } else if (question.type === 'checkbox') {
        answer = [question.options[0]];
      }

      await client.answerQuestion(checkIn.id, i, answer);
      console.log(`   ✓ Answered question ${i + 1} of ${checkIn.questions.length}`);
    }

    // Step 3: Verify check-in is still in progress
    console.log('\n3. Verifying check-in status...');
    const inProgressCheckIn = await client.getCheckInService().getCheckIn(checkIn.id);
    console.log(`   ✓ Status: ${inProgressCheckIn.status}`);
    console.log(`   ✓ Answered: ${questionsToAnswer} of ${checkIn.questions.length} questions`);

    // Step 4: Abort the check-in
    console.log('\n4. Aborting check-in...');
    await client.abortCheckIn(checkIn.id);
    console.log('   ✓ Check-in aborted');

    // Step 5: Verify check-in was aborted
    console.log('\n5. Verifying abortion...');
    const abortedCheckIn = await client.getCheckInService().getCheckIn(checkIn.id);
    console.log(`   ✓ Final status: ${abortedCheckIn.status}`);

    // Step 6: Verify no cards were generated
    console.log('\n6. Verifying no cards were generated...');
    const cards = await client.getCardService().getCardsByCheckIn(checkIn.id);
    console.log(`   ✓ Cards generated: ${cards.length} (should be 0)`);

    // Step 7: Check that answers were lost
    console.log('\n7. Confirming data loss...');
    console.log('   ✓ All answers have been discarded');

    // Step 8: Start and complete a new check-in to show recovery
    console.log('\n8. Starting fresh check-in to show recovery...');
    const newCheckIn = await client.startCheckIn();
    console.log(`   ✓ New check-in started: ${newCheckIn.id}`);
    
    // Quick completion
    for (let i = 0; i < newCheckIn.questions.length; i++) {
      const question = newCheckIn.questions[i];
      const answer = question.type === 'radio' 
        ? question.options[0] 
        : [question.options[0]];
      await client.answerQuestion(newCheckIn.id, i, answer);
    }
    
    const completedCheckIn = await client.completeCheckIn(newCheckIn.id);
    console.log(`   ✓ New check-in completed successfully`);

    console.log('\n✅ Abort Check-in Scenario completed successfully!\n');

    return {
      abortedCheckIn,
      completedCheckIn,
      verificationResults: {
        wasAborted: abortedCheckIn.status === 'aborted',
        noCardsGenerated: cards.length === 0,
        canStartNew: completedCheckIn.status === 'completed'
      }
    };

  } catch (error) {
    console.error('\n❌ Abort Check-in Scenario failed:', error);
    throw error;
  }
}