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

    // Note: We don't clean sample directories at startup anymore - only checkpoints are cleared

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
          console.error(
            `❌ Provider "${debugProvider}" not found. Available providers: ${[...new Set(providerModels.map(pm => pm.name))].join(', ')}`
          );
          process.exit(1);
        } else {
          selectedProviderModels = matchingProviders;

          // Filter by model(s) if specified
          if (debugModel) {
            // Parse comma-separated list of models
            const requestedModels = debugModel
              .split(",")
              .map((m) => m.trim())
              .filter((m) => m.length > 0);

            if (requestedModels.length > 0) {
              const matchingModels = matchingProviders.filter((pm) =>
                requestedModels.some(
                  (requestedModel) =>
                    pm.modelId.toLowerCase() === requestedModel.toLowerCase()
                )
              );

              if (matchingModels.length > 0) {
                selectedProviderModels = matchingModels;
                console.log(
                  `👉 Selected models: ${matchingModels
                    .map((m) => m.modelId)
                    .join(", ")}`
                );
              } else {
                console.warn(
                  `⚠️ None of the requested models "${debugModel}" found for provider "${debugProvider}"`
                );
                throw new Error(
                  `No matching models found for provider "${debugProvider}"`
                );
              }
            }
          } else {
            throw new Error(
              `No model specified for provider "${debugProvider}". Use DEBUG_MODEL to specify models.`
            );
          }
        }
      } else {
        // No provider specified, use first provider/model
        selectedProviderModels = [providerModels[0]];
      }

      console.log(
        `👉 Selected provider: ${selectedProviderModels[0].name} (${
          selectedProviderModels.length === 1
            ? selectedProviderModels[0].modelId
            : `${selectedProviderModels.length} models`
        })`
      );
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

    // Group provider models by provider name
    const providerGroups: Record<string, typeof selectedProviderModels> = {};
    for (const providerModel of selectedProviderModels) {
      if (!providerGroups[providerModel.name]) {
        providerGroups[providerModel.name] = [];
      }
      providerGroups[providerModel.name].push(providerModel);
    }

    const providerNames = Object.keys(providerGroups);
    console.log(
      `\n👉 Running tests with ${providerNames.length} providers in parallel...`
    );

    // Create a promise for each PROVIDER (not model)
    const providerPromises = providerNames.map(async (providerName) => {
      const providerResults: HumanEvalResult[] = [];
      const providerModels = providerGroups[providerName];

      console.log(`\n👉 Starting tests with ${providerName}...`);

      // Run each MODEL sequentially within this provider
      for (const providerWithModel of providerModels) {
        try {
          console.log(`\n👉 Running model: ${providerWithModel.modelId}...`);

          // Note: Sample directory cleaning is handled by test-manager.ts during test execution

          // Determine number of samples for this model
          // Use only 1 sample for expensive o1-pro models
          const modelNumSamples = providerWithModel.modelId.startsWith("o1-pro") ? 1 : numSamples;
          
          if (modelNumSamples !== numSamples) {
            console.log(`  ⚠️  Using ${modelNumSamples} sample${modelNumSamples > 1 ? 's' : ''} for expensive model`);
          }

          // Run tests with this provider model using HumanEval methodology
          const results = await runAllTestsHumanEval(
            providerWithModel.provider,
            modelNumSamples,
            testDefinitions, // Pass specific tests if in debug mode
            contextContent // Pass context content if available
          );

          // Add the results
          providerResults.push(...results);

          // Save individual model results immediately to prevent loss if later models fail
          if (results.length > 0) {
            try {
              await saveBenchmarkResults(results, contextFile, contextContent);
              console.log(`💾 Saved individual results for ${providerWithModel.modelId}`);
            } catch (saveError) {
              console.error(`⚠️  Failed to save individual results for ${providerWithModel.modelId}:`, saveError);
              // Don't fail the entire run, just log and continue
            }
          }

          // Note: Sample directories are cleaned during test execution, not here
        } catch (error) {
          console.error(
            `Error running tests with ${providerWithModel.name} (${providerWithModel.modelId}):`,
            error
          );
          // Continue with the next model rather than breaking the whole process
        }
      }

      return providerResults;
    });

    // Wait for all provider promises to complete
    const resultsArrays = await Promise.all(providerPromises);

    // Combine all results
    for (const results of resultsArrays) {
      allResults.push(...results);
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
