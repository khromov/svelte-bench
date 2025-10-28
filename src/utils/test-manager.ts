import path from "path";
import fs from "fs/promises";
import type { LLMProvider } from "../llms";
import {
  cleanTmpDir,
  cleanCheckpointDir,
  writeToTmpFile,
  readFile,
  saveCheckpoint,
  loadCheckpoint,
  removeCheckpoint,
} from "./file";
import { runTest } from "./test-runner";
import type { TestResult } from "./test-runner";
import { calculatePassAtK, type HumanEvalResult } from "./humaneval";
import { cleanCodeMarkdown } from "./code-cleaner";
import { withRetry } from "./retry-wrapper";

export interface TestDefinition {
  name: string;
  promptPath: string;
  testPath: string;
}

export interface CheckpointData {
  modelId: string;
  provider: string;
  completedResults: HumanEvalResult[];
  currentTestIndex: number;
  currentSampleIndex: number;
  currentTestSamples: BenchmarkResult[];
  contextContent?: string;
  numSamples: number;
  timestamp: string;
}

// We still need BenchmarkResult for the runSingleTest function
// which is used by runHumanEvalTest
export interface BenchmarkResult {
  testName: string;
  llmProvider: string;
  modelIdentifier: string;
  generatedCode: string;
  testResult: TestResult;
  promptPath: string;
  contextContent?: string;
  timestamp: string;
  sampleIndex?: number;
  temperature?: number;
}

/**
 * Load all test definitions from the src/tests directory
 */
export async function loadTestDefinitions(): Promise<TestDefinition[]> {
  const testsDir = path.resolve(process.cwd(), "src/tests");
  const testDirs = await fs.readdir(testsDir);

  const tests: TestDefinition[] = [];

  for (const dir of testDirs) {
    const testDir = path.join(testsDir, dir);
    const stats = await fs.stat(testDir);

    if (stats.isDirectory()) {
      const promptPath = path.join(testDir, "prompt.md");
      const testPath = path.join(testDir, "test.ts");

      // Check if both files exist
      try {
        await Promise.all([fs.access(promptPath), fs.access(testPath)]);

        tests.push({
          name: dir,
          promptPath,
          testPath,
        });
      } catch (error) {
        console.warn(`Skipping ${dir}: missing prompt.md or test.ts`);
      }
    }
  }

  return tests;
}

/**
 * Run a single test with the given LLM provider, sample index, and temperature
 */
export async function runSingleTest(
  test: TestDefinition,
  llmProvider: LLMProvider,
  sampleIndex: number = 0,
  temperature?: number,
  contextContent?: string,
): Promise<BenchmarkResult> {
  try {
    const providerName = llmProvider.name;

    // Read the prompt
    const prompt = await readFile(test.promptPath);

    // Generate code with the LLM
    console.log(
      `🔄 Generating ${test.name} component with ${providerName} (sample ${
        sampleIndex + 1
      }, temp: ${temperature ?? "default"})...`,
    );
    let generatedCode = await withRetry(
      async () => {
        const rawCode = await llmProvider.generateCode(prompt, temperature, contextContent);

        // Apply cleaning to remove markdown code blocks
        const cleanedCode = cleanCodeMarkdown(rawCode);

        // Check if the cleaned code is empty or only whitespace
        if (!cleanedCode.trim()) {
          console.warn(
            `⚠️ Generated code is empty after cleaning for ${test.name} with ${providerName}. Raw code was:`,
            rawCode,
          );
          throw new Error(
            "Generated code is empty after cleaning. This indicates an empty response from the LLM provider.",
          );
        }

        return cleanedCode;
      },
      {
        onRetry: (error, attempt) => {
          console.warn(
            `⚠️  Retry attempt ${attempt} for ${test.name} with ${providerName} after error: ${error.message}`,
          );
        },
      },
    );

    // Check if the generated code already includes <svelte:options runes={true} />
    if (!generatedCode.includes("<svelte:options runes={true} />")) {
      // Prepend it to the generated code
      generatedCode = "<svelte:options runes={true} />\n\n" + generatedCode;
    }

    // Use standard Component.svelte name
    const componentFilename = "Component.svelte";
    await writeToTmpFile(componentFilename, generatedCode, providerName);

    // Copy the test file
    const testContent = await readFile(test.testPath);
    const testFilename = `${test.name}.test.ts`;
    await writeToTmpFile(testFilename, testContent, providerName);

    // Make sure the files are fully written before proceeding
    const tmpDir = path.resolve(process.cwd(), "tmp", "samples", providerName.toLowerCase());
    await fs.access(path.join(tmpDir, componentFilename));
    await fs.access(path.join(tmpDir, testFilename));

    // Run the test with the standard test name
    const testResult = await runTest(test.name, providerName);

    return {
      testName: test.name,
      llmProvider: providerName,
      modelIdentifier: llmProvider.getModelIdentifier(),
      generatedCode,
      testResult,
      promptPath: test.promptPath,
      contextContent,
      timestamp: new Date().toISOString(),
      sampleIndex,
      temperature,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error running test ${test.name} with ${llmProvider.name}:`, errorMessage);

    return {
      testName: test.name,
      llmProvider: llmProvider.name,
      modelIdentifier: llmProvider.getModelIdentifier(),
      generatedCode: "",
      testResult: {
        testName: test.name,
        success: false,
        testFiles: 0,
        totalTests: 0,
        failedTests: 0,
        errors: [errorMessage],
      },
      promptPath: test.promptPath,
      contextContent,
      timestamp: new Date().toISOString(),
      sampleIndex,
      temperature,
    };
  }
}

/**
 * HumanEval implementation: Generate multiple samples for a single test
 * with sample-level checkpointing and resumption support
 *
 * This follows the HumanEval methodology by generating n samples with
 * appropriate temperature settings for each sample.
 */
export async function runHumanEvalTest(
  test: TestDefinition,
  llmProvider: LLMProvider,
  numSamples: number = 10,
  contextContent?: string,
  providerName?: string,
  modelId?: string,
  testIndex?: number,
  completedResults?: HumanEvalResult[],
  existingSamples: BenchmarkResult[] = [],
  startSampleIndex: number = 0,
): Promise<HumanEvalResult> {
  try {
    const actualProviderName = providerName || llmProvider.name;
    const actualModelId = modelId || llmProvider.getModelIdentifier();
    const samples: BenchmarkResult[] = [...existingSamples];

    // Run samples starting from startSampleIndex with checkpointing after each API call
    for (let i = startSampleIndex; i < numSamples; i++) {
      try {
        // Clean the tmp directory before each sample
        await cleanTmpDir(actualProviderName);

        // Determine temperature: 0 for first sample, undefined for others
        const temperature = i === 0 ? 0 : undefined;

        console.log(`🔄 Running sample ${i + 1}/${numSamples} for ${test.name} with ${actualProviderName}...`);

        // Run the test with the current sample index and appropriate temperature
        const result = await runSingleTest(test, llmProvider, i, temperature, contextContent);

        // Only add to samples if the API call was successful (has generated code)
        if (result.generatedCode.trim() !== "") {
          samples.push(result);
          console.log(`✅ Completed sample ${i + 1}/${numSamples} for ${test.name}`);
        } else {
          console.log(`⚠️ API failure for sample ${i + 1}/${numSamples} for ${test.name} - not adding to results`);
        }

        // Save checkpoint after each API call (successful or not)
        if (testIndex !== undefined && completedResults !== undefined) {
          const checkpointData: CheckpointData = {
            modelId: actualModelId,
            provider: actualProviderName,
            completedResults,
            currentTestIndex: testIndex,
            currentSampleIndex: i,
            currentTestSamples: samples,
            contextContent,
            numSamples,
            timestamp: new Date().toISOString(),
          };
          await saveCheckpoint(actualProviderName, actualModelId, checkpointData);
          console.log(`💾 Saved checkpoint after sample ${i + 1}/${numSamples}`);
        }
      } catch (error) {
        console.error(`Error running sample ${i + 1} for ${test.name} with ${actualProviderName}:`, error);

        // Save checkpoint even for failed samples to track progress
        if (testIndex !== undefined && completedResults !== undefined) {
          const checkpointData: CheckpointData = {
            modelId: actualModelId,
            provider: actualProviderName,
            completedResults,
            currentTestIndex: testIndex,
            currentSampleIndex: i,
            currentTestSamples: samples,
            contextContent,
            numSamples,
            timestamp: new Date().toISOString(),
          };
          await saveCheckpoint(actualProviderName, actualModelId, checkpointData);
          console.log(`💾 Saved checkpoint after failed sample ${i + 1}/${numSamples}`);
        }

        // If this was due to retry exhaustion, abort the entire run
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Failed after")) {
          console.error(`❌ Aborting run after exhausting retries for ${test.name}`);
          throw error;
        }

        // Continue with other samples for other types of errors
      }
    }

    // Calculate pass@k metrics - only count samples that were successfully run
    const validSamples = samples.filter((s) => s !== null && s !== undefined);
    const numValidSamples = validSamples.length;
    const numCorrect = validSamples.filter((s) => s.testResult.success).length;

    // If we have no valid samples, return default values
    if (numValidSamples === 0) {
      return {
        testName: test.name,
        provider: actualProviderName,
        modelId: actualModelId,
        numSamples: 0,
        numCorrect: 0,
        pass1: 0,
        pass10: 0,
        context: {
          used: !!contextContent,
          content: contextContent,
        },
        samples: [],
      };
    }

    const pass1 = calculatePassAtK(numValidSamples, numCorrect, 1);
    const pass10 = calculatePassAtK(numValidSamples, numCorrect, Math.min(10, numValidSamples));

    // Format the results
    return {
      testName: test.name,
      provider: actualProviderName,
      modelId: actualModelId,
      numSamples: numValidSamples,
      numCorrect,
      pass1,
      pass10,
      context: {
        used: !!contextContent,
        content: contextContent,
      },
      samples: validSamples.map((s) => ({
        index: s.sampleIndex || 0,
        code: s.generatedCode,
        success: s.testResult.success,
        errors: s.testResult.errors || [],
        temperature: s.temperature,
      })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error running HumanEval test ${test.name} with ${llmProvider.name}:`, errorMessage);

    // Return a failed result
    return {
      testName: test.name,
      provider: providerName || llmProvider.name,
      modelId: modelId || llmProvider.getModelIdentifier(),
      numSamples: 0,
      numCorrect: 0,
      pass1: 0,
      pass10: 0,
      context: {
        used: !!contextContent,
        content: contextContent,
      },
      samples: [],
    };
  }
}

/**
 * Run all tests with the given LLM provider using HumanEval methodology
 * Supports automatic resuming from checkpoints
 * @param llmProvider The LLM provider to use
 * @param numSamples Number of samples to generate for each test (default: 10)
 * @param specificTests Optional array of test definitions to run (default: all tests)
 * @param contextContent Optional context content to include in prompts
 */
export async function runAllTestsHumanEval(
  llmProvider: LLMProvider,
  numSamples: number = 10,
  specificTests?: TestDefinition[],
  contextContent?: string,
): Promise<HumanEvalResult[]> {
  try {
    const providerName = llmProvider.name;
    const modelId = llmProvider.getModelIdentifier();

    // Load test definitions
    let tests: TestDefinition[];
    if (specificTests && specificTests.length > 0) {
      tests = specificTests;
      console.log(`📋 Running ${tests.length} specific tests for ${providerName}`);
    } else {
      tests = await loadTestDefinitions();
      console.log(`📋 Found ${tests.length} tests to run for ${providerName}`);
    }

    // Check for existing checkpoint
    const checkpoint = await loadCheckpoint(providerName, modelId);
    let results: HumanEvalResult[] = [];
    let startTestIndex = 0;
    let startSampleIndex = 0;
    let currentTestSamples: BenchmarkResult[] = [];

    if (checkpoint) {
      console.log(`🔄 Found checkpoint for ${providerName}/${modelId}`);
      console.log(
        `🔄 Resuming from checkpoint at test ${checkpoint.currentTestIndex + 1}/${tests.length}, sample ${checkpoint.currentSampleIndex + 1}`,
      );
      results = checkpoint.completedResults || [];
      startTestIndex = checkpoint.currentTestIndex;
      startSampleIndex = checkpoint.currentSampleIndex + 1; // Resume from next sample
      currentTestSamples = checkpoint.currentTestSamples || [];

      // If we finished all samples for the current test, move to next test
      if (startSampleIndex >= numSamples) {
        startTestIndex = checkpoint.currentTestIndex + 1;
        startSampleIndex = 0;
        currentTestSamples = [];
      }

      // Verify checkpoint context matches current run
      if (checkpoint.contextContent !== contextContent || checkpoint.numSamples !== numSamples) {
        console.warn(`⚠️ Checkpoint context/samples mismatch - starting fresh`);
        results = [];
        startTestIndex = 0;
        startSampleIndex = 0;
        currentTestSamples = [];
        // Clear checkpoints for fresh start
        await cleanCheckpointDir(providerName);
      }
      // No cleaning when resuming from valid checkpoint
    } else {
      // Clear checkpoints at the beginning for new runs (but leave samples intact)
      await cleanCheckpointDir(providerName);
    }

    // Run remaining tests from checkpoint or start
    for (let i = startTestIndex; i < tests.length; i++) {
      const test = tests[i];

      try {
        console.log(`\n🧪 Running test: ${test.name} with ${providerName} (${i + 1}/${tests.length})`);

        // Determine starting sample index (0 for new tests, checkpoint value for resumed tests)
        const sampleStartIndex = i === startTestIndex ? startSampleIndex : 0;
        const existingSamples = i === startTestIndex ? currentTestSamples : [];

        // Run the test with sample-level checkpointing
        const result = await runHumanEvalTest(
          test,
          llmProvider,
          numSamples,
          contextContent,
          providerName,
          modelId,
          i,
          results,
          existingSamples,
          sampleStartIndex,
        );

        // Only add result if it has valid samples (not just API failures)
        if (result.numSamples > 0) {
          results.push(result);

          // Log the pass@k metrics
          console.log(
            `📊 ${test.name} (${providerName}) - pass@1: ${result.pass1.toFixed(
              4,
            )}, pass@10: ${result.pass10.toFixed(4)}`,
          );
          console.log(`   Samples: ${result.numSamples}, Correct: ${result.numCorrect}`);
        } else {
          console.log(`⚠️ Skipping ${test.name} - no successful API calls, not adding to final results`);
        }

        // Save checkpoint after each test completion (reset sample tracking)
        const checkpointData: CheckpointData = {
          modelId,
          provider: providerName,
          completedResults: results,
          currentTestIndex: i,
          currentSampleIndex: numSamples, // Mark all samples as completed
          currentTestSamples: [],
          contextContent,
          numSamples,
          timestamp: new Date().toISOString(),
        };
        await saveCheckpoint(providerName, modelId, checkpointData);
      } catch (error) {
        console.error(`Error running test ${test.name} with ${providerName}:`, error);

        // If this was due to retry exhaustion, abort the entire run
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Failed after")) {
          console.error(`❌ Aborting entire run due to repeated API failures`);

          // Save final checkpoint before aborting
          const checkpointData: CheckpointData = {
            modelId,
            provider: providerName,
            completedResults: results,
            currentTestIndex: i,
            currentSampleIndex: 0,
            currentTestSamples: [],
            contextContent,
            numSamples,
            timestamp: new Date().toISOString(),
          };
          await saveCheckpoint(providerName, modelId, checkpointData);

          // Don't continue with other tests, abort
          throw error;
        }

        // Save checkpoint for non-fatal errors and continue
        const checkpointData: CheckpointData = {
          modelId,
          provider: providerName,
          completedResults: results,
          currentTestIndex: i,
          currentSampleIndex: numSamples, // Mark test as completed (even if failed)
          currentTestSamples: [],
          contextContent,
          numSamples,
          timestamp: new Date().toISOString(),
        };
        await saveCheckpoint(providerName, modelId, checkpointData);

        // Continue with other tests rather than failing completely
      }
    }

    // Clean up checkpoint after successful completion
    await removeCheckpoint(providerName, modelId);

    return results;
  } catch (error) {
    console.error(`Error running all tests for ${llmProvider.name}:`, error);
    // Return an empty array rather than throwing an error
    return [];
  }
}

/**
 * Ensure the benchmarks directory exists
 */
export async function ensureBenchmarksDir(): Promise<void> {
  const benchmarksDir = path.resolve(process.cwd(), "benchmarks");
  try {
    await fs.mkdir(benchmarksDir, { recursive: true });
  } catch (error) {
    console.error("Error creating benchmarks directory:", error);
    throw error;
  }
}

/**
 * Save benchmark results to a file
 */
export async function saveBenchmarkResults(
  results: HumanEvalResult[],
  contextFile?: string,
  contextContent?: string,
  customFilenamePrefix?: string,
): Promise<string> {
  try {
    // Ensure the benchmarks directory exists
    await ensureBenchmarksDir();

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    let filenamePrefix: string;

    if (customFilenamePrefix) {
      // Clean the custom filename prefix to be filesystem-safe
      const cleanPrefix = customFilenamePrefix.replace(/[^a-zA-Z0-9\-_]/g, "-");
      filenamePrefix = contextFile
        ? `benchmark-results-with-context-${cleanPrefix}-`
        : `benchmark-results-${cleanPrefix}-`;
    } else {
      filenamePrefix = contextFile ? `benchmark-results-with-context-` : `benchmark-results-`;
    }

    const filename = `${filenamePrefix}${timestamp}.json`;
    const filePath = path.resolve(process.cwd(), "benchmarks", filename);

    // Add context information to the results if it's not already there
    const resultsWithContext = results.map((result) => {
      if (!result.context) {
        result.context = {
          used: !!contextContent,
          filename: contextFile,
          content: contextContent,
        };
      }
      return {
        ...result,
        timestamp: new Date().toISOString(),
      };
    });

    await fs.writeFile(filePath, JSON.stringify(resultsWithContext, null, 2));
    console.log(`📊 Saved benchmark results to ${filePath}`);

    return filePath;
  } catch (error) {
    console.error("Error saving benchmark results:", error);
    throw error;
  }
}
