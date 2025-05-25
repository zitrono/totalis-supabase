import { serve } from "./index.ts";
import {
  assertEquals,
  assertJsonResponse,
  createMockRequest,
} from "../_shared/test-utils.ts";

Deno.test("CheckIn Start Function", async (t) => {
  await t.step("should return 400 without category ID", async () => {
    const req = createMockRequest("POST", {});
    const response = await serve(req);
    const data = await assertJsonResponse(response, 400);
    assertEquals(data.error, "Category ID is required");
  });

  await t.step("should create check-in with valid category", async () => {
    const req = createMockRequest("POST", { categoryId: "cat-1" });
    const response = await serve(req);
    const data = await assertJsonResponse(response, 200);

    assertEquals(data.message, "Check-in started successfully");
    assertEquals(data.checkIn.status, "in_progress");
    assertEquals(data.checkIn.category_id, "cat-1");
    assertEquals(Array.isArray(data.questions), true);
    assertEquals(data.questions.length > 0, true);
  });

  await t.step("should return category-specific questions", async () => {
    const req = createMockRequest("POST", { categoryId: "cat-1" });
    const response = await serve(req);
    const data = await assertJsonResponse(response, 200);

    // Check that questions are relevant to the category
    const hasRelevantQuestion = data.questions.some((q: string) =>
      q.toLowerCase().includes("stress")
    );
    assertEquals(hasRelevantQuestion, true);
  });

  await t.step("should handle non-existent category", async () => {
    const req = createMockRequest("POST", { categoryId: "invalid-cat" });
    const response = await serve(req);
    const data = await assertJsonResponse(response, 404);
    assertEquals(data.error, "Invalid category");
  });
});
