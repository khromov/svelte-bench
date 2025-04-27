// Load environment variables from .env file
import "dotenv/config";

import { getAllLLMProviders } from "./src/llms";
import { cleanTmpDir } from "./src/utils/file";
import { runAllTests, saveBenchmarkResults } from "./src/utils/test-manager";
import type { BenchmarkResult } from "./src/utils/test-manager";
import { ensureRequiredDirectories } from "./src/utils/ensure-dirs";

let CONCURRENCY_LIMIT = 3;

/**
 * Main function to run the benchmark
 */
async function runBenchmark() {
  console.log("🚀 Starting SvelteBench...");

  try {
    // Ensure required directories exist
    await ensureRequiredDirectories();

    // Clean tmp directory
    await cleanTmpDir();

    // Get all available LLM providers and models
    console.log("👉 Discovering available LLM providers and models...");
    const providerModels = await getAllLLMProviders();

    console.log(
      `👉 Found ${providerModels.length} provider/model combinations`
    );

    // Run all tests with all providers
    const allResults: BenchmarkResult[] = [];

    for (const providerWithModel of providerModels) {
      console.log(
        `\n👉 Running tests with ${providerWithModel.name} (${providerWithModel.modelId})...`
      );

      // Run tests with this provider (10 tests in parallel)
      const results = await runAllTests(providerWithModel.provider, CONCURRENCY_LIMIT);
      allResults.push(...results);

      // Clean tmp directory between providers
      await cleanTmpDir();
    }

    // Save benchmark results
    await saveBenchmarkResults(allResults);

    // Print summary
    console.log("\n📊 Benchmark Summary:");
    console.log("===========================================");

    // Group results by test name
    const resultsByTest: Record<string, BenchmarkResult[]> = {};
    for (const result of allResults) {
      if (!resultsByTest[result.testName]) {
        resultsByTest[result.testName] = [];
      }
      resultsByTest[result.testName].push(result);
    }

    let totalSuccess = 0;

    // Print results by test and provider
    for (const [testName, results] of Object.entries(resultsByTest)) {
      console.log(`\nTest: ${testName}`);

      for (const result of results) {
        const status = result.testResult.success ? "✅ PASS" : "❌ FAIL";
        console.log(
          `  ${status} - ${result.llmProvider} (${result.modelIdentifier})`
        );
        console.log(
          `    Tests: ${result.testResult.totalTests}, Failed: ${result.testResult.failedTests}`
        );

        if (result.testResult.success) {
          totalSuccess++;
        }
      }
    }

    console.log("\n===========================================");
    console.log(
      `Total: ${allResults.length}, Passed: ${totalSuccess}, Failed: ${
        allResults.length - totalSuccess
      }`
    );

    // Clean up
    await cleanTmpDir();

    // Exit with appropriate code
    const exitCode = totalSuccess > 0 ? 0 : 1;
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
