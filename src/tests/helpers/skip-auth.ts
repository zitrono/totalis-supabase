import { getTestConfig } from '../config/test-env'

/**
 * Skip authentication-dependent tests in preview environments
 * where auth.users cannot be modified
 */
export function skipIfPreview(testName: string): boolean {
  const config = getTestConfig()
  
  if (config.isPreview || process.env.SKIP_AUTH_TESTS === 'true') {
    console.log(`⏭️  Skipping "${testName}" - Auth not available in preview`)
    return true
  }
  
  return false
}

/**
 * Conditionally run test based on environment
 */
export function testWithAuth(testName: string, testFn: () => void | Promise<void>) {
  if (skipIfPreview(testName)) {
    test.skip(testName, testFn)
  } else {
    test(testName, testFn)
  }
}

/**
 * Get mock user ID for tests that don't require real auth
 */
export function getMockUserId(email: string): string {
  const mockUserIds: Record<string, string> = {
    'test1@totalis.app': '11111111-1111-1111-1111-111111111111',
    'test2@totalis.app': '22222222-2222-2222-2222-222222222222',
    'test3@totalis.app': '33333333-3333-3333-3333-333333333333'
  }
  
  return mockUserIds[email] || '00000000-0000-0000-0000-000000000000'
}