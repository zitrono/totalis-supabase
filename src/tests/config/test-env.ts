export interface TestConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey: string
  testMode: 'remote'
  testRunId: string
  cleanupStrategy: 'immediate' | 'delayed' | 'manual'
  testDataTTL: number // hours
}

export const getTestConfig = (): TestConfig => {
  const testRunId = process.env.TEST_RUN_ID || `test_${Date.now()}_${Math.random().toString(36).substring(7)}`
  
  // Always use remote database
  const supabaseUrl = process.env.SUPABASE_URL!
  if (!supabaseUrl || supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
    throw new Error('Local database is not supported. Please configure SUPABASE_URL to point to remote Supabase instance.')
  }
  
  return {
    supabaseUrl,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY!,
    testMode: 'remote',
    testRunId,
    cleanupStrategy: (process.env.TEST_CLEANUP_STRATEGY as any) || 'immediate',
    testDataTTL: parseInt(process.env.TEST_DATA_TTL || '24')
  }
}

export function logTestConfig(config: TestConfig) {
  console.log('🧪 Test Configuration:')
  console.log(`  Mode: ${config.testMode}`)
  console.log(`  URL: ${config.supabaseUrl}`)
  console.log(`  Test Run ID: ${config.testRunId}`)
  console.log(`  Cleanup Strategy: ${config.cleanupStrategy}`)
  console.log(`  Data TTL: ${config.testDataTTL} hours`)
  console.log('')
}