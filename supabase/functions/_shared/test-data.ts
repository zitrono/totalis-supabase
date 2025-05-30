/// <reference lib="deno.ns" />

/**
 * Test environment detection utility for edge functions
 * Helps edge functions determine if they're running in a test environment
 */

/**
 * Checks if we're in a test environment
 */
export function isTestEnvironment(req?: Request): boolean {
  return Deno.env.get("ENVIRONMENT") === "test" ||
    Deno.env.get("IS_TEST") === "true" ||
    (req && req.headers.get("X-Test-Mode") === "true");
}

// Deprecated functions - kept for backward compatibility but no-op
export function getTestMetadata(_req?: Request): undefined {
  return undefined;
}

export function markAsTestData<T>(data: T): T {
  return data;
}

export function mergeTestMetadata<T extends Record<string, any>>(
  data: T,
  _testMetadata?: any,
): T {
  return data;
}
