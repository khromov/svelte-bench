import { getLLMProvider } from "./src/llms";
import { ensureTmpDir, cleanTmpDir } from "./src/utils/file";
import { runAllTests, saveBenchmarkResults } from "./src/utils/test-manager";

/**
 * Main function to run the benchmark
 */
async function runBenchmark() {
  console.log("🚀 Starting SvelteBench...");

  try {
    // Ensure tmp directory exists
    await ensureTmpDir();

    // Clean tmp directory
    await cleanTmpDir();

    // Get the LLM provider (default to OpenAI for now)
    const providerName = process.env.LLM_PROVIDER || "openai";
    console.log(`👉 Using LLM provider: ${providerName}`);

    const llmProvider = await getLLMProvider(providerName);

    // Run all tests
    const results = await runAllTests(llmProvider);

    // Save benchmark results
    await saveBenchmarkResults(results);

    // Print summary
    console.log("\n📊 Benchmark Summary:");
    console.log("===========================================");

    let totalSuccess = 0;

    for (const result of results) {
      const status = result.testResult.success ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} - ${result.testName}`);
      console.log(
        `  Tests: ${result.testResult.totalTests}, Failed: ${result.testResult.failedTests}`
      );

      if (result.testResult.success) {
        totalSuccess++;
      }
    }

    console.log("===========================================");
    console.log(
      `Total: ${results.length}, Passed: ${totalSuccess}, Failed: ${
        results.length - totalSuccess
      }`
    );

    // Clean up
    await cleanTmpDir();

    // Exit with appropriate code
    const exitCode = totalSuccess === results.length ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error("Error running benchmark:", error);
    process.exit(1);
  }
}

// Run the benchmark
runBenchmark().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
