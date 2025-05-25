import { serve } from "./index.ts";
import {
  assertEquals,
  assertJsonResponse,
  createMockRequest,
} from "../_shared/test-utils.ts";

Deno.test("Analytics Summary Function", async (t) => {
  await t.step("should return week analytics by default", async () => {
    const req = createMockRequest("POST", {});
    const response = await serve(req);
    const data = await assertJsonResponse(response, 200);

    assertEquals(data.summary.period, "week");
    assertEquals(typeof data.summary.totalCheckIns, "number");
    assertEquals(typeof data.summary.completedCheckIns, "number");
    assertEquals(Array.isArray(data.summary.topCategories), true);
    assertEquals(typeof data.summary.streakDays, "number");
    assertEquals(Array.isArray(data.summary.insights), true);
  });

  await t.step("should return month analytics", async () => {
    const req = createMockRequest("POST", { period: "month" });
    const response = await serve(req);
    const data = await assertJsonResponse(response, 200);

    assertEquals(data.summary.period, "month");
    assertEquals(data.details.period.start < data.details.period.end, true);
  });

  await t.step("should return all-time analytics", async () => {
    const req = createMockRequest("POST", { period: "all" });
    const response = await serve(req);
    const data = await assertJsonResponse(response, 200);

    assertEquals(data.summary.period, "all");
  });

  await t.step("should calculate completion rate", async () => {
    const req = createMockRequest("POST", { period: "week" });
    const response = await serve(req);
    const data = await assertJsonResponse(response, 200);

    assertEquals(typeof data.details.completionRate, "string");
    assertEquals(data.details.completionRate.includes("%"), true);
  });

  await t.step("should identify most active time", async () => {
    const req = createMockRequest("POST", { period: "week" });
    const response = await serve(req);
    const data = await assertJsonResponse(response, 200);

    assertEquals(typeof data.details.mostActiveTime, "string");
    const validTimes = [
      "Night owl (12 AM - 6 AM)",
      "Morning person (6 AM - 12 PM)",
      "Afternoon (12 PM - 6 PM)",
      "Evening (6 PM - 12 AM)",
      "No activity yet",
    ];
    assertEquals(validTimes.includes(data.details.mostActiveTime), true);
  });

  await t.step("should include AI insights", async () => {
    const req = createMockRequest("POST", { period: "week" });
    const response = await serve(req);
    const data = await assertJsonResponse(response, 200);

    assertEquals(Array.isArray(data.summary.insights), true);
    if (data.summary.insights.length > 0) {
      assertEquals(typeof data.summary.insights[0], "string");
    }
  });
});
