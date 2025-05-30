/// <reference lib="deno.ns" />

/**
 * Test data marking utility for edge functions
 * Marks data created during tests for automatic cleanup
 */

export interface TestMetadata {
  test: boolean;
  test_run_id?: string;
  test_timestamp?: string;
  test_environment?: string;
}

/**
 * Gets test metadata if running in test environment
 */
export function getTestMetadata(req?: Request): TestMetadata | undefined {
  const isTest = Deno.env.get("ENVIRONMENT") === "test" ||
    Deno.env.get("IS_TEST") === "true" ||
    (req && req.headers.get("X-Test-Mode") === "true");

  if (!isTest) {
    return undefined;
  }

  return {
    test: true,
    test_run_id: Deno.env.get("TEST_RUN_ID") ||
      req?.headers.get("X-Test-Run-ID") || `test-${Date.now()}`,
    test_timestamp: new Date().toISOString(),
    test_environment: "edge-function",
  };
}

/**
 * Marks an object with test metadata if in test environment
 */
export function markAsTestData<T extends { metadata?: any }>(data: T): T {
  const testMetadata = getTestMetadata();

  if (!testMetadata) {
    return data;
  }

  return {
    ...data,
    metadata: {
      ...data.metadata,
      ...testMetadata,
    },
  };
}

/**
 * Checks if we're in a test environment
 */
export function isTestEnvironment(): boolean {
  return Deno.env.get("ENVIRONMENT") === "test" ||
    Deno.env.get("IS_TEST") === "true";
}

/**
 * Merges test metadata into an object
 */
export function mergeTestMetadata<T extends Record<string, any>>(
  data: T,
  testMetadata?: TestMetadata,
): T {
  if (!testMetadata) {
    return data;
  }

  return {
    ...data,
    metadata: {
      ...data.metadata,
      ...testMetadata,
    },
  };
}
