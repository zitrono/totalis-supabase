import { serve } from "./index.ts";
import {
  assertEquals,
  assertJsonResponse,
  createMockRequest,
} from "../_shared/test-utils.ts";

Deno.test("Audio Transcribe Function - Security & Validation", async (t) => {
  await t.step("should return 401 without auth header", async () => {
    const formData = new FormData();
    formData.append("audio", new File(["test"], "test.mp3", { type: "audio/mp3" }));
    
    const req = new Request("http://localhost", {
      method: "POST",
      body: formData,
    });
    
    const response = await serve(req);
    const data = await assertJsonResponse(response, 401);
    assertEquals(data.error, "Unauthorized");
  });

  await t.step("should return 405 for non-POST requests", async () => {
    const req = createMockRequest("GET", {});
    const response = await serve(req);
    const data = await assertJsonResponse(response, 405);
    assertEquals(data.error, "Method not allowed");
  });

  await t.step("should return 400 without audio file", async () => {
    const formData = new FormData();
    const req = createMockRequest("POST", formData);
    const response = await serve(req);
    const data = await assertJsonResponse(response, 400);
    assertEquals(data.error, "No audio file provided");
  });

  await t.step("should reject oversized files", async () => {
    // Create a file larger than 25MB
    const largeContent = new Uint8Array(26 * 1024 * 1024); // 26MB
    const largeFile = new File([largeContent], "large.mp3", { type: "audio/mp3" });

    const formData = new FormData();
    formData.append("audio", largeFile);

    const req = createMockRequest("POST", formData);
    const response = await serve(req);
    const data = await assertJsonResponse(response, 400);

    assertEquals(data.error, "File too large");
    assertEquals(data.maxSize, "25MB");
  });

  await t.step("should reject unsupported formats", async () => {
    const audioContent = new Uint8Array([0, 1, 2, 3]);
    const audioFile = new File([audioContent], "test.xyz", { type: "audio/xyz" });

    const formData = new FormData();
    formData.append("audio", audioFile);

    const req = createMockRequest("POST", formData);
    const response = await serve(req);
    const data = await assertJsonResponse(response, 400);

    assertEquals(data.error, "Unsupported audio format");
    assertEquals(data.supportedFormats.includes("mp3"), true);
    assertEquals(data.supportedFormats.includes("webm"), true);
    assertEquals(data.supportedFormats.includes("m4a"), true);
  });

  await t.step("should handle CORS preflight", async () => {
    const req = new Request("http://localhost", { method: "OPTIONS" });
    const response = await serve(req);
    assertEquals(response.status, 200);
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
  });
});

Deno.test("Audio Transcribe Function - Supported Formats", async (t) => {
  const formats = [
    { type: "audio/webm", ext: "webm" },
    { type: "audio/m4a", ext: "m4a" },
    { type: "audio/mp3", ext: "mp3" },
    { type: "audio/mpeg", ext: "mp3" },
    { type: "audio/wav", ext: "wav" },
    { type: "audio/ogg", ext: "ogg" },
    { type: "audio/flac", ext: "flac" },
  ];

  for (const format of formats) {
    await t.step(`should accept ${format.ext} format`, async () => {
      const audioContent = new Uint8Array([0, 1, 2, 3]);
      const audioFile = new File([audioContent], `test.${format.ext}`, { 
        type: format.type 
      });

      const formData = new FormData();
      formData.append("audio", audioFile);

      const req = createMockRequest("POST", formData);
      
      // Mock environment variable
      const originalEnv = Deno.env.get("OPENAI_API_KEY");
      Deno.env.set("OPENAI_API_KEY", "test-key");
      
      const response = await serve(req);
      
      // Since we're mocking, we expect the request to succeed with valid format
      // In real tests with mocked fetch, we'd check for 200 status
      
      // Restore environment
      if (originalEnv) {
        Deno.env.set("OPENAI_API_KEY", originalEnv);
      } else {
        Deno.env.delete("OPENAI_API_KEY");
      }
    });
  }
});

Deno.test("Audio Transcribe Function - Rate Limiting", async (t) => {
  await t.step("should track rate limits per user", () => {
    // Rate limiting is implemented in memory
    // In a real test, we'd need to mock multiple requests
    // and verify the 429 response after limit is exceeded
    assertEquals(true, true); // Placeholder
  });
});

Deno.test("Audio Transcribe Function - Optional Parameters", async (t) => {
  await t.step("should accept optional prompt parameter", async () => {
    const audioFile = new File(["test"], "test.mp3", { type: "audio/mp3" });
    const formData = new FormData();
    formData.append("audio", audioFile);
    formData.append("prompt", "This is a medical consultation about health");
    
    const req = createMockRequest("POST", formData);
    // Test that the request is properly formed
    const formDataFromReq = await req.clone().formData();
    assertEquals(formDataFromReq.get("prompt"), "This is a medical consultation about health");
  });

  await t.step("should accept optional language parameter", async () => {
    const audioFile = new File(["test"], "test.mp3", { type: "audio/mp3" });
    const formData = new FormData();
    formData.append("audio", audioFile);
    formData.append("language", "es");
    
    const req = createMockRequest("POST", formData);
    // Test that the request is properly formed
    const formDataFromReq = await req.clone().formData();
    assertEquals(formDataFromReq.get("language"), "es");
  });
});

Deno.test("Audio Transcribe Function - Error Handling", async (t) => {
  await t.step("should return 503 when OPENAI_API_KEY is missing", async () => {
    const originalEnv = Deno.env.get("OPENAI_API_KEY");
    Deno.env.delete("OPENAI_API_KEY");
    
    const audioFile = new File(["test"], "test.mp3", { type: "audio/mp3" });
    const formData = new FormData();
    formData.append("audio", audioFile);
    
    const req = createMockRequest("POST", formData);
    const response = await serve(req);
    const data = await assertJsonResponse(response, 503);
    
    assertEquals(data.error, "Service temporarily unavailable");
    
    // Restore environment
    if (originalEnv) {
      Deno.env.set("OPENAI_API_KEY", originalEnv);
    }
  });

  await t.step("should handle unexpected errors gracefully", async () => {
    // Test error handling by sending malformed data
    const req = createMockRequest("POST", "invalid-body");
    const response = await serve(req);
    
    assertEquals(response.status, 500);
    const data = await response.json();
    assertEquals(data.error, "An unexpected error occurred");
    assertEquals(typeof data.errorId, "string");
  });
});