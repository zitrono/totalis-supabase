import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

export { assertEquals, assertExists };

// Mock Supabase client for testing
export function createMockSupabaseClient() {
  // deno-lint-ignore no-explicit-any
  const mockData: Record<string, any[]> = {
    coaches: [
      {
        id: "5932309f-63bd-4002-bb95-73672c334a69",
        name: "Daniel",
        voice: "supportive",
      },
    ],
    categories: [
      { id: "cat-1", name: "Stress Management", max_questions: 3 },
    ],
    user_profiles: [
      { id: "user-1", coach_id: "5932309f-63bd-4002-bb95-73672c334a69" },
    ],
    check_ins: [],
    recommendations: [],
    messages: [],
  };

  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: { id: "user-1", email: "test@example.com" } },
          error: null,
        }),
    },
    from: (table: string) => ({
      select: (_columns?: string) => ({
        // deno-lint-ignore no-explicit-any
        eq: (column: string, value: any) => ({
          single: () =>
            Promise.resolve({
              data: mockData[table]?.find((item) => item[column] === value) ||
                null,
              error: null,
            }),
          // deno-lint-ignore no-explicit-any
          order: (_column: string, _options?: any) => ({
            limit: (count: number) =>
              Promise.resolve({
                data: mockData[table]?.slice(0, count) || [],
                error: null,
              }),
          }),
        }),
        // deno-lint-ignore no-explicit-any
        order: (_column: string, _options?: any) => ({
          limit: (count: number) =>
            Promise.resolve({
              data: mockData[table]?.slice(0, count) || [],
              error: null,
            }),
        }),
        single: () =>
          Promise.resolve({
            data: mockData[table]?.[0] || null,
            error: null,
          }),
      }),
      // deno-lint-ignore no-explicit-any
      insert: (data: any) => {
        const newData = Array.isArray(data) ? data : [data];
        newData.forEach((item) => {
          mockData[table] = mockData[table] || [];
          mockData[table].push({ ...item, id: crypto.randomUUID() });
        });
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: mockData[table][mockData[table].length - 1],
                error: null,
              }),
          }),
        };
      },
      // deno-lint-ignore no-explicit-any
      update: (data: any) => ({
        // deno-lint-ignore no-explicit-any
        eq: (column: string, value: any) =>
          Promise.resolve({
            data: null,
            error: null,
          }),
      }),
    }),
  };
}

// Mock request helper
export function createMockRequest(
  method: string,
  // deno-lint-ignore no-explicit-any
  body?: any,
  headers?: Record<string, string>,
): Request {
  const url = "http://localhost:54321/functions/v1/test";
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-jwt-token",
      ...headers,
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new Request(url, init);
}

// Response assertion helper
export async function assertJsonResponse(
  response: Response,
  expectedStatus: number,
) {
  assertEquals(response.status, expectedStatus);
  const contentType = response.headers.get("content-type");
  assertEquals(contentType, "application/json");

  const data = await response.json();
  assertExists(data);
  return data;
}
