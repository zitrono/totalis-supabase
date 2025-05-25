#!/usr/bin/env deno run --allow-all

console.log("🧪 Running Edge Functions Tests...\n");

const testFiles = [
  "./langflow-webhook/index.test.ts",
  "./recommendations/index.test.ts",
  "./checkin-start/index.test.ts",
  "./checkin-process/index.test.ts",
  "./chat-ai-response/index.test.ts",
  "./analytics-summary/index.test.ts",
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const file of testFiles) {
  try {
    console.log(`\n📁 Testing ${file}...`);
    const proc = new Deno.Command("deno", {
      args: ["test", "--allow-all", file],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await proc.output();
    const output = new TextDecoder().decode(stdout);
    const errorOutput = new TextDecoder().decode(stderr);

    console.log(output);
    if (errorOutput) console.error(errorOutput);

    // Parse test results
    const testMatch = output.match(/(\d+) passed.*?(\d+) failed/s);
    if (testMatch) {
      const passed = parseInt(testMatch[1]);
      const failed = parseInt(testMatch[2]);
      totalTests += passed + failed;
      passedTests += passed;
      failedTests += failed;
    }

    if (code !== 0) {
      console.error(`❌ Tests failed for ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error running tests for ${file}:`, error);
    failedTests++;
  }
}

console.log("\n" + "=".repeat(50));
console.log("📊 Test Summary:");
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log("=".repeat(50));

if (failedTests > 0) {
  Deno.exit(1);
}
