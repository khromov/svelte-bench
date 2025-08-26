// Load environment variables from .env file
import "dotenv/config";

import { getAllLLMProviders, getLLMProvider } from "./src/llms";
import { cleanTmpDir, loadContextFile } from "./src/utils/file";
import {
  runAllTestsHumanEval as runAllTestsHumanEvalParallel,
  saveBenchmarkResults,
  loadTestDefinitions,
} from "./src/utils/parallel-test-manager";
import {
  runAllTestsHumanEval as runAllTestsHumanEvalSequential,
} from "./src/utils/test-manager";
import type { HumanEvalResult } from "./src/utils/humaneval";
import { ensureRequiredDirectories } from "./src/utils/ensure-dirs";
import { validateModels } from "./src/utils/model-validator";
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
  try {
    // Parse command line arguments
    const { contextFile } = parseCommandLineArgs();
    
    // Check for parallel execution environment variable
    const parallel = process.env.PARALLEL_EXECUTION === "true";
    
    const executionMode = parallel ? "PARALLEL EXECUTION" : "SEQUENTIAL EXECUTION";
    console.log(`🚀 Starting SvelteBench with HumanEval methodology (${executionMode})...`);

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

    // Note: We don't clean sample directories at startup anymore - only checkpoints are cleared

    // Check if we're in debug mode
    const isDebugMode = process.env.DEBUG_MODE === "true";

    // Initialize provider models array
    let selectedProviderModels: any[] = [];

    if (isDebugMode) {
      console.log("🐛 Running in DEBUG_MODE");

      // Get debug settings
      const debugProvider = process.env.DEBUG_PROVIDER;
      const debugModel = process.env.DEBUG_MODEL;

      if (!debugProvider) {
        throw new Error("DEBUG_PROVIDER must be specified in debug mode");
      }

      if (!debugModel) {
        throw new Error(
          `No model specified for provider "${debugProvider}". Use DEBUG_MODEL to specify models.`
        );
      }

      // Parse comma-separated list of models
      const requestedModels = debugModel
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      if (requestedModels.length === 0) {
        throw new Error("DEBUG_MODEL must contain at least one model");
      }

      // Validate models
      console.log(`👉 Validating models for provider ${debugProvider}...`);
      const validModels = await validateModels(debugProvider, requestedModels);

      if (validModels.length === 0) {
        throw new Error(
          `None of the requested models are valid for provider "${debugProvider}". Models tested: ${requestedModels.join(", ")}`
        );
      }

      // Create provider instances for valid models
      for (const modelId of validModels) {
        const provider = await getLLMProvider(debugProvider, modelId);
        selectedProviderModels.push({
          provider,
          name: debugProvider.charAt(0).toUpperCase() + debugProvider.slice(1),
          modelId,
        });
      }

      console.log(
        `👉 Selected provider: ${selectedProviderModels[0].name} (${
          selectedProviderModels.length === 1
            ? selectedProviderModels[0].modelId
            : `${selectedProviderModels.length} models`
        })`
      );
    } else {
      // Non-debug mode: Get all available LLM providers and models
      console.log("👉 Discovering available LLM providers and models...");
      const providerModels = await getAllLLMProviders();

      if (providerModels.length === 0) {
        console.warn("⚠️ No pre-configured models found. Please use DEBUG_MODE with specific models.");
        throw new Error("No LLM provider/model combinations found. Use DEBUG_MODE to specify models.");
      }

      console.log(
        `👉 Found ${providerModels.length} provider/model combinations`
      );

      selectedProviderModels = providerModels;
    }

    const debugTest = process.env.DEBUG_TEST;

    // Load test definitions based on debug mode
    let testDefinitions = undefined;
    if (isDebugMode) {
      const allTests = await loadTestDefinitions();

      if (allTests.length === 0) {
        throw new Error("No tests found");
      }

      if (debugTest) {
        const matchingTest = allTests.find((test) => test.name === debugTest);
        if (matchingTest) {
          testDefinitions = [matchingTest];
          console.log(`👉 Selected test: ${matchingTest.name}`);
        } else {
          console.warn(`⚠️ Test "${debugTest}" not found, using all tests`);
          testDefinitions = undefined; // Use all tests
        }
      } else {
        // No test specified, use all tests
        testDefinitions = undefined;
        console.log(`👉 Using all available tests`);
      }
    }

    // Set number of samples (use 10 samples by default unless a specific test was requested)
    const numSamples = debugTest ? 1 : 10;

    console.log(
      `👉 Running with ${numSamples} samples per test (for pass@k metrics)`
    );

    const allResults: HumanEvalResult[] = [];

    if (parallel) {
      // Run all provider/model combinations in parallel
      console.log(
        `\n👉 Running tests with ${selectedProviderModels.length} provider/model combinations in parallel...`
      );

      // Create a promise for each provider/model combination
      const providerPromises = selectedProviderModels.map(async (providerWithModel) => {
        try {
          console.log(`\n👉 Starting tests with ${providerWithModel.name} (${providerWithModel.modelId})...`);

          // Determine number of samples for this model
          // Use only 1 sample for expensive o1-pro models
          const modelNumSamples = providerWithModel.modelId.startsWith("o1-pro") ? 1 : numSamples;
          
          if (modelNumSamples !== numSamples) {
            console.log(`  ⚠️  Using ${modelNumSamples} sample${modelNumSamples > 1 ? 's' : ''} for expensive model`);
          }

          // Run tests with this provider model using parallel HumanEval methodology
          const results = await runAllTestsHumanEvalParallel(
            providerWithModel.provider,
            modelNumSamples,
            testDefinitions, // Pass specific tests if in debug mode
            contextContent // Pass context content if available
          );

          // Save individual model results immediately to prevent loss if later models fail
          if (results.length > 0) {
            try {
              await saveBenchmarkResults(results, contextFile, contextContent, undefined, "v2");
              console.log(`💾 Saved individual results for ${providerWithModel.modelId}`);
            } catch (saveError) {
              console.error(`⚠️  Failed to save individual results for ${providerWithModel.modelId}:`, saveError);
              // Don't fail the entire run, just log and continue
            }
          }

          return results;
        } catch (error) {
          console.error(
            `Error running tests with ${providerWithModel.name} (${providerWithModel.modelId}):`,
            error
          );
          // Return empty results rather than throwing
          return [];
        }
      });

      // Wait for all provider promises to complete
      const resultsArrays = await Promise.all(providerPromises);

      // Combine all results
      for (const results of resultsArrays) {
        allResults.push(...results);
      }
    } else {
      // Run provider/model combinations sequentially
      console.log(
        `\n👉 Running tests with ${selectedProviderModels.length} provider/model combinations sequentially...`
      );

      for (const providerWithModel of selectedProviderModels) {
        try {
          console.log(`\n👉 Starting tests with ${providerWithModel.name} (${providerWithModel.modelId})...`);

          // Determine number of samples for this model
          // Use only 1 sample for expensive o1-pro models
          const modelNumSamples = providerWithModel.modelId.startsWith("o1-pro") ? 1 : numSamples;
          
          if (modelNumSamples !== numSamples) {
            console.log(`  ⚠️  Using ${modelNumSamples} sample${modelNumSamples > 1 ? 's' : ''} for expensive model`);
          }

          // Run tests with this provider model using sequential HumanEval methodology
          const results = await runAllTestsHumanEvalSequential(
            providerWithModel.provider,
            modelNumSamples,
            testDefinitions, // Pass specific tests if in debug mode
            contextContent // Pass context content if available
          );

          // Add results to combined array
          allResults.push(...results);

          // Save individual model results immediately to prevent loss if later models fail
          if (results.length > 0) {
            try {
              await saveBenchmarkResults(results, contextFile, contextContent, undefined, "v2");
              console.log(`💾 Saved individual results for ${providerWithModel.modelId}`);
            } catch (saveError) {
              console.error(`⚠️  Failed to save individual results for ${providerWithModel.modelId}:`, saveError);
              // Don't fail the entire run, just log and continue
            }
          }
        } catch (error) {
          console.error(
            `Error running tests with ${providerWithModel.name} (${providerWithModel.modelId}):`,
            error
          );
          // Continue with next provider instead of failing completely
        }
      }
    }


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
            result.numSamples > 1 ? `, pass@10: ${result.pass10.toFixed(4)}` : ""
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

    // Note: We no longer clean sample directories at the end - they're preserved for inspection

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
