import { serve } from "./index.ts";
import {
  assertEquals,
  assertJsonResponse,
  createMockRequest,
} from "../_shared/test-utils.ts";

Deno.test("Langflow Webhook Function", async (t) => {
  await t.step("should echo valid payload", async () => {
    const payload = {
      flowId: "test-flow",
      result: { message: "AI response" },
      metadata: { userId: "user-123" },
    };

    const req = createMockRequest("POST", payload);
    const response = await serve(req);
    const data = await assertJsonResponse(response, 200);

    assertEquals(data.received, true);
    assertEquals(data.echo, payload);
    assertEquals(typeof data.timestamp, "string");
  });

  await t.step("should handle invalid JSON", async () => {
    const req = new Request(
      "http://localhost:54321/functions/v1/langflow-webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      },
    );

    const response = await serve(req);
    const data = await assertJsonResponse(response, 400);
    assertEquals(data.error, "Invalid webhook payload");
  });

  await t.step("should log webhook details", async () => {
    const payload = { test: "data" };
    const req = createMockRequest("POST", payload);

    // Capture console.log output
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));

    await serve(req);

    console.log = originalLog;

    const hasWebhookLog = logs.some((log) =>
      log.includes("Langflow webhook received:")
    );
    assertEquals(hasWebhookLog, true);
  });
});
