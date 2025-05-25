import { TotalisTestClient } from '../index';

export async function runCategoryCheckInScenario(client: TotalisTestClient) {
  console.log('\n🧪 Running Category Check-in Scenario...\n');

  try {
    // Ensure user is authenticated
    const user = await client.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated first');
    }

    // Step 1: Get all categories
    console.log('1. Getting all categories...');
    const categories = await client.getAllCategories();
    console.log(`   ✓ Found ${categories.length} categories`);
    
    // Find a parent category
    const parentCategories = categories.filter(c => !c.parent_id);
    const selectedCategory = parentCategories[0];
    console.log(`   ✓ Selected category: ${selectedCategory.name}`);

    // Step 2: Get user's progress for this category
    console.log('\n2. Checking category progress...');
    let userCategory = await client.getCategoryProgress(selectedCategory.id);
    console.log(`   ✓ Current progress: ${userCategory?.progress || 0}%`);

    // Step 3: Mark category as favorite
    console.log('\n3. Marking category as favorite...');
    userCategory = await client.markCategoryAsFavorite(selectedCategory.id);
    console.log(`   ✓ Category marked as favorite`);

    // Step 4: Get Type 2 cards (insights that suggest check-ins)
    console.log('\n4. Getting Type 2 cards (check-in triggers)...');
    const type2Cards = await client.getCardsByCategory(selectedCategory.id);
    const insightCards = type2Cards.filter(c => c.type === 2);
    console.log(`   ✓ Found ${insightCards.length} insight cards`);

    // Step 5: Start category-specific check-in
    console.log('\n5. Starting category-specific check-in...');
    const checkIn = await client.startCheckIn(selectedCategory.id);
    console.log(`   ✓ Check-in started for ${selectedCategory.name}`);
    console.log(`   ✓ Questions: ${checkIn.questions.length}`);

    // Step 6: Answer questions with variety
    console.log('\n6. Answering check-in questions...');
    for (let i = 0; i < checkIn.questions.length; i++) {
      const question = checkIn.questions[i];
      let answer: any;
      let explanation: string | undefined;
      
      if (question.type === 'radio') {
        // Vary answers
        answer = question.options[i % question.options.length];
      } else if (question.type === 'checkbox') {
        // Select multiple options
        answer = question.options.filter((_, idx) => idx % 2 === 0);
        explanation = 'Additional context for my selections';
      }

      await client.answerQuestion(checkIn.id, i, answer, explanation);
      console.log(`   ✓ Q${i+1}: "${question.question.substring(0, 40)}..."`);
    }

    // Step 7: Complete check-in
    console.log('\n7. Completing check-in...');
    const completedCheckIn = await client.completeCheckIn(checkIn.id);
    console.log(`   ✓ Check-in completed`);
    console.log(`   ✓ Summary: "${completedCheckIn.summary}"`);

    // Step 8: Check updated progress
    console.log('\n8. Checking updated category progress...');
    userCategory = await client.getCategoryProgress(selectedCategory.id);
    console.log(`   ✓ New progress: ${userCategory?.progress || 0}%`);

    // Step 9: Get new cards
    console.log('\n9. Getting newly generated cards...');
    const newCards = await client.getCardsByCategory(selectedCategory.id);
    const recentCards = newCards.filter(c => c.checkin_id === checkIn.id);
    console.log(`   ✓ Generated ${recentCards.length} new cards`);

    // Step 10: Mark a card as checked
    if (recentCards.length > 0) {
      console.log('\n10. Marking card as checked...');
      const cardToCheck = recentCards.find(c => c.type === 1) || recentCards[0];
      await client.markCardAsChecked(cardToCheck.id);
      console.log(`   ✓ Marked card as checked: "${cardToCheck.title}"`);
    }

    console.log('\n✅ Category Check-in Scenario completed successfully!\n');

    return {
      category: selectedCategory,
      checkIn: completedCheckIn,
      cards: recentCards,
      progress: userCategory?.progress || 0
    };

  } catch (error) {
    console.error('\n❌ Category Check-in Scenario failed:', error);
    throw error;
  }
}