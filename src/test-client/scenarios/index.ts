// Export all test scenarios
export { runNewUserScenario } from './new-user.scenario';
export { runCategoryCheckInScenario } from './category-checkin.scenario';
export { runChatInteractionScenario } from './chat-interaction.scenario';
export { runAbortCheckInScenario } from './abort-checkin.scenario';

// Scenario runner utility
import { TotalisTestClient } from '../index';

export interface ScenarioResult {
  scenario: string;
  success: boolean;
  duration: number;
  error?: Error;
  data?: any;
}

export async function runAllScenarios(client: TotalisTestClient): Promise<ScenarioResult[]> {
  const scenarios = [
    { name: 'New User', fn: () => import('./new-user.scenario').then(m => m.runNewUserScenario(client)) },
    { name: 'Chat Interaction', fn: () => import('./chat-interaction.scenario').then(m => m.runChatInteractionScenario(client)) },
    { name: 'Category Check-in', fn: () => import('./category-checkin.scenario').then(m => m.runCategoryCheckInScenario(client)) },
    { name: 'Abort Check-in', fn: () => import('./abort-checkin.scenario').then(m => m.runAbortCheckInScenario(client)) }
  ];

  const results: ScenarioResult[] = [];

  console.log('🚀 Running all test scenarios...\n');

  for (const scenario of scenarios) {
    const startTime = Date.now();
    
    try {
      const data = await scenario.fn();
      const duration = Date.now() - startTime;
      
      results.push({
        scenario: scenario.name,
        success: true,
        duration,
        data
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      results.push({
        scenario: scenario.name,
        success: false,
        duration,
        error: error as Error
      });
    }
  }

  // Summary
  console.log('\n📊 Test Scenarios Summary:');
  console.log('━'.repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const time = `${(result.duration / 1000).toFixed(2)}s`;
    console.log(`${status} ${result.scenario.padEnd(20)} ${time}`);
    
    if (!result.success && result.error) {
      console.log(`   └─ Error: ${result.error.message}`);
    }
  });
  
  console.log('━'.repeat(50));
  console.log(`Total: ${results.length} | Passed: ${successful} | Failed: ${failed}`);
  console.log(`Total time: ${(results.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(2)}s`);

  return results;
}