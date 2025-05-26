import { SupabaseClient } from '@supabase/supabase-js';
import { ScenarioResult, TestUser } from '../types';
import { AuthService } from '../services/auth.service';
import { CheckInService } from '../services/checkin.service';
import { CategoryService } from '../services/category.service';

/**
 * Full Check-in Flow Scenario
 * Tests the complete check-in process from start to completion with analytics
 */
export async function runFullCheckInFlowScenario(
  supabase: SupabaseClient
): Promise<ScenarioResult> {
  const logs: string[] = [];
  let testUser: TestUser | null = null;
  let checkInId: string | null = null;

  try {
    logs.push('Starting full check-in flow scenario...');

    // Step 1: Create and authenticate user
    const authService = new AuthService(supabase);
    const authResult = await authService.signUpWithEmail(
      `checkin-flow-${Date.now()}@example.com`,
      'TestPassword123!'
    );
    
    if (!authResult.user) {
      throw new Error('Failed to create test user');
    }
    
    testUser = authResult;
    logs.push(`✓ Created test user: ${testUser.user.email}`);

    // Step 2: Get available categories
    const categoryService = new CategoryService(supabase);
    const categories = await categoryService.getCategories();
    
    if (categories.length === 0) {
      throw new Error('No categories available');
    }

    const targetCategory = categories.find(c => 
      c.name.toLowerCase().includes('stress') || 
      c.name.toLowerCase().includes('mental')
    ) || categories[0];

    logs.push(`✓ Selected category: ${targetCategory.name}`);

    // Step 3: Start check-in
    const checkInService = new CheckInService(supabase);
    const startResult = await checkInService.startCheckIn(targetCategory.id);
    
    checkInId = startResult.checkInId;
    logs.push(`✓ Started check-in: ${checkInId}`);
    logs.push(`  First question: ${startResult.firstQuestion.text}`);
    logs.push(`  Question type: ${startResult.firstQuestion.responseType}`);
    logs.push(`  Total questions: ${startResult.firstQuestion.total}`);

    // Verify check-in history
    if (startResult.history) {
      logs.push(`  Previous check-ins: ${startResult.history.recentCheckins}`);
      logs.push(`  Trend: ${startResult.history.trend || 'No trend data'}`);
    }

    // Step 4: Answer first question
    const processResult1 = await checkInService.processCheckIn(checkInId, {
      answer: "I've been feeling quite stressed lately, around a 7 out of 10",
      action: "continue"
    });

    logs.push(`✓ Answered question 1/${processResult1.nextQuestion.total}`);
    logs.push(`  Next question: ${processResult1.nextQuestion.text}`);
    logs.push(`  Progress: ${processResult1.progress.percentage}%`);

    // Step 5: Answer second question
    const processResult2 = await checkInService.processCheckIn(checkInId, {
      answer: "Work deadlines and family responsibilities are the main sources",
      action: "continue"
    });

    logs.push(`✓ Answered question 2/${processResult2.nextQuestion.total}`);
    logs.push(`  Can complete early: ${processResult2.canComplete}`);

    // Step 6: Answer third question
    const processResult3 = await checkInService.processCheckIn(checkInId, {
      answer: "I notice tension in my shoulders and difficulty sleeping",
      action: "continue"
    });

    logs.push(`✓ Answered question 3/${processResult3.nextQuestion.total}`);

    // Step 7: Complete check-in
    const completionResult = await checkInService.processCheckIn(checkInId, {
      answer: "I think taking regular breaks and practicing mindfulness would help",
      action: "complete"
    });

    if (completionResult.status !== "completed") {
      throw new Error('Check-in completion failed');
    }

    logs.push(`✓ Completed check-in`);
    logs.push(`  Wellness level: ${completionResult.summary.wellnessLevel}/10`);
    logs.push(`  Summary: ${completionResult.summary.summary}`);
    
    if (completionResult.summary.insights.length > 0) {
      logs.push(`  Insights:`);
      completionResult.summary.insights.forEach(insight => {
        logs.push(`    - ${insight}`);
      });
    }

    if (completionResult.summary.recommendations.length > 0) {
      logs.push(`  Recommendations:`);
      completionResult.summary.recommendations.forEach(rec => {
        logs.push(`    - ${rec}`);
      });
    }

    logs.push(`  Next check-in: ${completionResult.summary.nextCheckInSuggestion}`);

    // Step 8: Verify check-in data
    const { data: checkInData, error: checkInError } = await supabase
      .from('checkins')
      .select(`
        *,
        categories (name),
        user_categories (*)
      `)
      .eq('id', checkInId)
      .single();

    if (checkInError) {
      throw new Error(`Failed to fetch check-in data: ${checkInError.message}`);
    }

    logs.push(`✓ Verified check-in data`);
    logs.push(`  Status: ${checkInData.status}`);
    logs.push(`  Responses: ${checkInData.responses.length}`);
    logs.push(`  Completion percentage: ${checkInData.completion_percentage}%`);

    // Step 9: Verify user_category stats update
    if (checkInData.user_categories) {
      logs.push(`✓ User category stats updated`);
      logs.push(`  Total check-ins: ${checkInData.user_categories.total_checkins}`);
      logs.push(`  Average wellness: ${checkInData.user_categories.average_wellness_level}`);
    }

    // Step 10: Check generated recommendations
    const { data: recommendations } = await supabase
      .from('recommendations')
      .select('*')
      .eq('checkin_id', checkInId);

    if (recommendations && recommendations.length > 0) {
      logs.push(`✓ Generated ${recommendations.length} recommendations from check-in`);
      recommendations.forEach(rec => {
        logs.push(`  - ${rec.title} (${rec.priority_level} priority)`);
      });
    }

    // Step 11: Test abandon flow with new check-in
    const abandonResult = await checkInService.startCheckIn(targetCategory.id);
    
    if (abandonResult.status === "existing") {
      logs.push(`✓ Correctly prevented duplicate check-in`);
    } else {
      // Start new check-in for abandon test
      const newCheckIn = await checkInService.startCheckIn(categories[1].id);
      const abandonedCheckIn = await checkInService.processCheckIn(
        newCheckIn.checkInId, 
        { action: "abandon" }
      );
      
      logs.push(`✓ Successfully abandoned check-in: ${abandonedCheckIn.status}`);
    }

    // Step 12: Verify analytics
    const { data: analyticsEvents } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('user_id', testUser.user.id)
      .in('event_type', ['checkin_started', 'checkin_completed']);

    logs.push(`✓ Verified ${analyticsEvents?.length || 0} analytics events`);

    return {
      success: true,
      logs,
      summary: `Successfully completed full check-in flow with wellness level ${completionResult.summary.wellnessLevel}/10`,
      data: {
        checkInId,
        wellnessLevel: completionResult.summary.wellnessLevel,
        questionsAnswered: checkInData.responses.length,
        recommendationsGenerated: recommendations?.length || 0
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