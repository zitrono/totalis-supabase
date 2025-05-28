import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export interface TestMetadata {
  test: boolean
  test_run_id: string
  test_scenario?: string
  test_created_at: string
  test_cleanup_after: string
}

export function extractTestMetadata(req: Request): TestMetadata | null {
  const testRunId = req.headers.get('X-Test-Run-Id')
  
  if (!testRunId) {
    return null
  }
  
  const scenario = req.headers.get('X-Test-Scenario') || undefined
  const now = new Date()
  const cleanupAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
  
  return {
    test: true,
    test_run_id: testRunId,
    test_scenario: scenario,
    test_created_at: now.toISOString(),
    test_cleanup_after: cleanupAfter.toISOString()
  }
}

export function mergeTestMetadata(
  existingMetadata: Record<string, any> = {},
  testMetadata: TestMetadata | null
): Record<string, any> {
  if (!testMetadata) {
    return existingMetadata
  }
  
  return {
    ...existingMetadata,
    ...testMetadata
  }
}

export async function markRecordAsTest(
  supabase: SupabaseClient,
  tableName: string,
  recordId: string,
  testMetadata: TestMetadata | null
): Promise<void> {
  if (!testMetadata) return
  
  const { error } = await supabase
    .from(tableName)
    .update({ metadata: testMetadata } as any)
    .eq('id', recordId)
  
  if (error) {
    console.error(`Failed to mark ${tableName} record as test:`, error)
  }
}