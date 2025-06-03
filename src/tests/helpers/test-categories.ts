// Test categorization for preview branch compatibility
export enum TestCategory {
  PREVIEW_SAFE = 'preview-safe',    // 60% - Runs in preview
  AUTH_REQUIRED = 'auth-required',  // 40% - Skipped in preview
}

export interface TestCategoryResult {
  category: TestCategory;
  reason: string;
}

/**
 * Categorize a test based on its file path and content
 * Preview-safe tests can run with seeded test users
 * Auth-required tests need real OAuth flows or password reset
 */
export function categorizeTest(testPath: string): TestCategoryResult {
  // Tests that work with seeded auth users (60% target)
  const previewSafe = [
    'sdk-operations',      // Database CRUD operations
    'database-queries',    // Query testing
    'rls-policies',        // Row-level security
    'edge-functions',      // Edge function calls
    'storage-operations',  // File upload/download
    'user-profiles',       // Profile management
    'messages',            // Message operations
    'recommendations',     // Recommendation queries
    'categories',          // Category operations
    'checkins',            // Check-in functionality
  ];
  
  // Tests that need real auth flows (40%)
  const authRequired = [
    'oauth-login',         // Google/Apple OAuth
    'password-reset',      // Email-based reset
    'email-verification',  // Email confirmation
    'session-refresh',     // Token refresh
    'signup-flow',         // New user registration
    'magic-link',          // Passwordless login
    'mfa',                 // Multi-factor auth
    'account-deletion',    // GDPR compliance
  ];
  
  // Check if test is preview-safe
  for (const pattern of previewSafe) {
    if (testPath.includes(pattern)) {
      return {
        category: TestCategory.PREVIEW_SAFE,
        reason: `Test contains '${pattern}' which works with seeded users`
      };
    }
  }
  
  // Check if test requires real auth
  for (const pattern of authRequired) {
    if (testPath.includes(pattern)) {
      return {
        category: TestCategory.AUTH_REQUIRED,
        reason: `Test contains '${pattern}' which requires real auth flows`
      };
    }
  }
  
  // Default to auth-required for safety
  return {
    category: TestCategory.AUTH_REQUIRED,
    reason: 'Test not explicitly marked as preview-safe'
  };
}

/**
 * Get test user credentials for preview-safe tests
 */
export const TEST_USERS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'test1@totalis.app',
    password: 'Test123!@#',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'test2@totalis.app',
    password: 'Test123!@#',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'test3@totalis.app',
    password: 'Test123!@#',
  },
] as const;

/**
 * Get a test user by index or email
 */
export function getTestUser(indexOrEmail: number | string) {
  if (typeof indexOrEmail === 'number') {
    return TEST_USERS[indexOrEmail % TEST_USERS.length];
  }
  return TEST_USERS.find(u => u.email === indexOrEmail) || TEST_USERS[0];
}