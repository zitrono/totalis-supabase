export interface TestConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey: string
  testMode: 'remote'
}

export const getTestConfig = (): TestConfig => {
  // Always use remote database
  const supabaseUrl = process.env.SUPABASE_URL!
  if (!supabaseUrl || supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
    throw new Error('Local database is not supported. Please configure SUPABASE_URL to point to remote Supabase instance.')
  }
  
  return {
    supabaseUrl,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!,
    testMode: 'remote'
  }
}

export function logTestConfig(config: TestConfig) {
  console.log('🧪 Test Configuration:')
  console.log(`  Mode: ${config.testMode}`)
  console.log(`  URL: ${config.supabaseUrl}`)
  console.log('')
}