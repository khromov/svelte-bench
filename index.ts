// Load environment variables from .env file
import "dotenv/config";

import { getAllLLMProviders } from "./src/llms";
import { cleanTmpDir } from "./src/utils/file";
import {
  runAllTestsHumanEval,
  saveBenchmarkResults,
} from "./src/utils/test-manager";
import type { HumanEvalResult } from "./src/utils/humaneval";
import { ensureRequiredDirectories } from "./src/utils/ensure-dirs";

/**
 * Main function to run the benchmark
 */
async function runBenchmark() {
  console.log("🚀 Starting SvelteBench with HumanEval methodology...");

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

    // Run all tests with all providers using HumanEval methodology
    const allResults: HumanEvalResult[] = [];
    const numSamples = 10; // Use n=10 samples per problem for HumanEval

    for (const providerWithModel of providerModels) {
      console.log(
        `\n👉 Running tests with ${providerWithModel.name} (${providerWithModel.modelId})...`
      );

      // Run tests with this provider using HumanEval methodology
      const results = await runAllTestsHumanEval(
        providerWithModel.provider,
        numSamples
      );
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
    const resultsByTest: Record<string, HumanEvalResult[]> = {};
    for (const result of allResults) {
      if (!resultsByTest[result.testName]) {
        resultsByTest[result.testName] = [];
      }
      resultsByTest[result.testName].push(result);
    }

    let totalSuccess = 0;
    let totalSamples = 0;

    // Print results by test and provider
    for (const [testName, results] of Object.entries(resultsByTest)) {
      console.log(`\nTest: ${testName}`);

      for (const result of results) {
        console.log(`  ${result.provider} (${result.modelId}):`);
        console.log(
          `    pass@1: ${result.pass1.toFixed(
            4
          )}, pass@10: ${result.pass10.toFixed(4)}`
        );
        console.log(
          `    Samples: ${result.numSamples}, Correct: ${result.numCorrect}`
        );

        totalSuccess += result.numCorrect;
        totalSamples += result.numSamples;
      }
    }

    console.log("\n===========================================");
    console.log(
      `Total Samples: ${totalSamples}, Passed: ${totalSuccess}, Failed: ${
        totalSamples - totalSuccess
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
