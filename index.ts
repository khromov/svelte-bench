// Load environment variables from .env file
import "dotenv/config";

import { getAllLLMProviders } from "./src/llms";
import { cleanTmpDir, loadContextFile } from "./src/utils/file";
import {
  runAllTestsHumanEval,
  saveBenchmarkResults,
  loadTestDefinitions,
} from "./src/utils/test-manager";
import type { HumanEvalResult } from "./src/utils/humaneval";
import { ensureRequiredDirectories } from "./src/utils/ensure-dirs";
import path from "path";

/**
 * Parse command line arguments
 * @returns Parsed command line arguments
 */
function parseCommandLineArgs(): {
  contextFile?: string;
} {
  const args = process.argv.slice(2);
  let contextFile: string | undefined;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--context" && i + 1 < args.length) {
      contextFile = args[i + 1];
      i++; // Skip the next argument as it's the value for --context
    }
  }

  return {
    contextFile,
  };
}

/**
 * Main function to run the benchmark
 */
async function runBenchmark() {
  console.log("🚀 Starting SvelteBench with HumanEval methodology...");

  try {
    // Parse command line arguments
    const { contextFile } = parseCommandLineArgs();

    // Load context file if specified
    let contextContent = "";
    if (contextFile) {
      try {
        // Resolve path relative to the current working directory
        const contextFilePath = path.resolve(process.cwd(), contextFile);
        contextContent = await loadContextFile(contextFilePath);
        console.log(`👉 Using context file: ${contextFilePath}`);
      } catch (error) {
        console.error(`Error loading context file: ${error}`);
        process.exit(1);
      }
    }

    // Ensure required directories exist
    await ensureRequiredDirectories();

    // Clean base tmp directory
    await cleanTmpDir();

    // Check if we're in debug mode
    const isDebugMode = process.env.DEBUG_MODE === "true";

    // Get all available LLM providers and models
    console.log("👉 Discovering available LLM providers and models...");
    const providerModels = await getAllLLMProviders();

    if (providerModels.length === 0) {
      throw new Error("No LLM provider/model combinations found");
    }

    console.log(
      `👉 Found ${providerModels.length} provider/model combinations`
    );

    // Filter providers in debug mode
    let selectedProviderModels = providerModels;

    if (isDebugMode) {
      console.log("🐛 Running in DEBUG_MODE");

      // Get debug settings
      const debugProvider = process.env.DEBUG_PROVIDER;
      const debugModel = process.env.DEBUG_MODEL;

      // Filter by provider if specified
      if (debugProvider) {
        const matchingProviders = providerModels.filter(
          (pm) => pm.name.toLowerCase() === debugProvider.toLowerCase()
        );

        if (matchingProviders.length === 0) {
          console.warn(
            `⚠️ Provider "${debugProvider}" not found, using first provider: ${providerModels[0].name}`
          );
        } else {
          selectedProviderModels = matchingProviders;

          // Filter by model if specified
          if (debugModel) {
            const matchingProviderModel = matchingProviders.find(
              (pm) => pm.modelId.toLowerCase() === debugModel.toLowerCase()
            );

            if (matchingProviderModel) {
              selectedProviderModels = [matchingProviderModel];
            } else {
              console.warn(
                `⚠️ Model "${debugModel}" not found for provider "${debugProvider}", using first model: ${matchingProviders[0].modelId}`
              );
              selectedProviderModels = [matchingProviders[0]];
            }
          } else {
            // No model specified, use first model for the provider
            selectedProviderModels = [matchingProviders[0]];
          }
        }
      } else {
        // No provider specified, use first provider/model
        selectedProviderModels = [providerModels[0]];
      }

      console.log(
        `👉 Selected provider: ${selectedProviderModels[0].name} (${selectedProviderModels[0].modelId})`
      );
    }

    // Load test definitions based on debug mode
    let testDefinitions = undefined;
    if (isDebugMode) {
      const allTests = await loadTestDefinitions();

      if (allTests.length === 0) {
        throw new Error("No tests found");
      }

      const debugTest = process.env.DEBUG_TEST;

      if (debugTest) {
        const matchingTest = allTests.find((test) => test.name === debugTest);
        if (matchingTest) {
          testDefinitions = [matchingTest];
          console.log(`👉 Selected test: ${matchingTest.name}`);
        } else {
          console.warn(
            `⚠️ Test "${debugTest}" not found, using first test: ${allTests[0].name}`
          );
          testDefinitions = [allTests[0]];
        }
      } else {
        // No test specified, use first test
        testDefinitions = [allTests[0]];
        console.log(`👉 Selected test: ${allTests[0].name}`);
      }
    }

    // Set number of samples based on debug mode
    // In debug mode: only 1 sample (pass@1 only) to speed up development
    // In normal mode: 10 samples for proper HumanEval metrics
    const numSamples = isDebugMode ? 1 : 10;

    if (isDebugMode) {
      console.log(
        `👉 DEBUG_MODE: Running with only ${numSamples} sample per test (pass@1 only)`
      );
    } else {
      console.log(
        `👉 Running with ${numSamples} samples per test (for pass@k metrics)`
      );
    }

    // Run all tests with all selected providers in parallel
    console.log(
      `\n👉 Running tests with ${selectedProviderModels.length} providers concurrently...`
    );

    // Create a promise for each provider
    const providerPromises = selectedProviderModels.map(
      async (providerWithModel) => {
        try {
          console.log(
            `\n👉 Starting tests with ${providerWithModel.name} (${providerWithModel.modelId})...`
          );

          // Ensure provider-specific tmp directory exists and is clean
          await cleanTmpDir(providerWithModel.name);

          // Run tests with this provider using HumanEval methodology
          const results = await runAllTestsHumanEval(
            providerWithModel.provider,
            numSamples,
            testDefinitions, // Pass specific tests if in debug mode
            contextContent // Pass context content if available
          );

          // Clean provider-specific tmp directory after tests
          await cleanTmpDir(providerWithModel.name);

          return results;
        } catch (error) {
          console.error(
            `Error running tests with ${providerWithModel.name}:`,
            error
          );
          return []; // Return empty array on error to avoid breaking the whole process
        }
      }
    );

    // Wait for all provider tests to complete
    const allProviderResults = await Promise.all(providerPromises);

    // Combine all results into a single array
    const allResults: HumanEvalResult[] = allProviderResults.flat();

    // Save benchmark results with context information if available
    await saveBenchmarkResults(allResults, contextFile, contextContent);

    // Print summary
    console.log(`\n📊 ${isDebugMode ? "Debug" : "Benchmark"} Summary:`);
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
          `    pass@1: ${result.pass1.toFixed(4)}${
            numSamples > 1 ? `, pass@10: ${result.pass10.toFixed(4)}` : ""
          }`
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

    // Clean up all tmp directories
    await cleanTmpDir();
    for (const provider of selectedProviderModels) {
      await cleanTmpDir(provider.name);
    }

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
