import path from "path";
import fs from "fs/promises";
import type { LLMProvider } from "../llms";
import { cleanTmpDir, writeToTmpFile, readFile } from "./file";
import { runTest } from "./test-runner";
import type { TestResult } from "./test-runner";
import { calculatePassAtK, type HumanEvalResult } from "./humaneval";
import { cleanCodeMarkdown } from "./code-cleaner";

export interface TestDefinition {
  name: string;
  promptPath: string;
  testPath: string;
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
  contextContent?: string
): Promise<BenchmarkResult> {
  try {
    const providerName = llmProvider.name;

    // Read the prompt
    const prompt = await readFile(test.promptPath);

    // Generate code with the LLM
    console.log(
      `🔄 Generating ${test.name} component with ${providerName} (sample ${
        sampleIndex + 1
      }, temp: ${temperature ?? 'default'})...`
    );
    let generatedCode = await llmProvider.generateCode(
      prompt,
      temperature,
      contextContent
    );

    // Apply a second pass of cleaning to ensure all backticks are removed
    generatedCode = cleanCodeMarkdown(generatedCode);

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
    const tmpDir = path.resolve(
      process.cwd(),
      "tmp",
      providerName.toLowerCase()
    );
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
    console.error(
      `Error running test ${test.name} with ${llmProvider.name}:`,
      errorMessage
    );

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
 *
 * This follows the HumanEval methodology by generating n samples with
 * appropriate temperature settings for each sample.
 */
export async function runHumanEvalTest(
  test: TestDefinition,
  llmProvider: LLMProvider,
  numSamples: number = 10,
  contextContent?: string
): Promise<HumanEvalResult> {
  try {
    const providerName = llmProvider.name;
    const samples: BenchmarkResult[] = [];

    // Use temperature of 0 for pass@1 calculations
    // and default temperature for the rest of the samples
    // This ensures deterministic results for the first sample

    // First sample with temperature 0 (for pass@1)
    try {
      // Clean the tmp directory before each test (not between samples)
      await cleanTmpDir(providerName);

      const firstSample = await runSingleTest(
        test,
        llmProvider,
        0,
        0,
        contextContent
      );
      samples.push(firstSample);
    } catch (error) {
      console.error(
        `Error running first sample for ${test.name} with ${providerName}:`,
        error
      );
      // Continue with other samples rather than failing completely
    }

    // Remaining samples with default temperature (for pass@k where k>1)
    for (let i = 1; i < numSamples; i++) {
      try {
        // Clean the tmp directory before each sample
        await cleanTmpDir(providerName);

        // Run the test with the current sample index and default temperature
        const result = await runSingleTest(
          test,
          llmProvider,
          i,
          undefined,
          contextContent
        );
        samples.push(result);
      } catch (error) {
        console.error(
          `Error running sample ${i + 1} for ${
            test.name
          } with ${providerName}:`,
          error
        );
        // Continue with other samples rather than failing completely
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
        provider: providerName,
        modelId: llmProvider.getModelIdentifier(),
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
    const pass10 = calculatePassAtK(
      numValidSamples,
      numCorrect,
      Math.min(10, numValidSamples)
    );

    // Format the results
    return {
      testName: test.name,
      provider: providerName,
      modelId: llmProvider.getModelIdentifier(),
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
    console.error(
      `Error running HumanEval test ${test.name} with ${llmProvider.name}:`,
      errorMessage
    );

    // Return a failed result
    return {
      testName: test.name,
      provider: llmProvider.name,
      modelId: llmProvider.getModelIdentifier(),
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
 * @param llmProvider The LLM provider to use
 * @param numSamples Number of samples to generate for each test (default: 10)
 * @param specificTests Optional array of test definitions to run (default: all tests)
 * @param contextContent Optional context content to include in prompts
 */
export async function runAllTestsHumanEval(
  llmProvider: LLMProvider,
  numSamples: number = 10,
  specificTests?: TestDefinition[],
  contextContent?: string
): Promise<HumanEvalResult[]> {
  try {
    const providerName = llmProvider.name;

    // Clean the provider-specific tmp directory once at the beginning
    await cleanTmpDir(providerName);

    // Load test definitions
    let tests: TestDefinition[];
    if (specificTests && specificTests.length > 0) {
      tests = specificTests;
      console.log(
        `📋 Running ${tests.length} specific tests for ${providerName}`
      );
    } else {
      tests = await loadTestDefinitions();
      console.log(`📋 Found ${tests.length} tests to run for ${providerName}`);
    }

    // Run each test in sequence
    const results: HumanEvalResult[] = [];

    for (const test of tests) {
      try {
        console.log(`\n🧪 Running test: ${test.name} with ${providerName}`);
        const result = await runHumanEvalTest(
          test,
          llmProvider,
          numSamples,
          contextContent
        );
        results.push(result);

        // Log the pass@k metrics
        console.log(
          `📊 ${test.name} (${providerName}) - pass@1: ${result.pass1.toFixed(
            4
          )}, pass@10: ${result.pass10.toFixed(4)}`
        );
        console.log(
          `   Samples: ${result.numSamples}, Correct: ${result.numCorrect}`
        );
      } catch (error) {
        console.error(
          `Error running test ${test.name} with ${providerName}:`,
          error
        );
        // Continue with other tests rather than failing completely
      }
    }

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
  contextContent?: string
): Promise<string> {
  try {
    // Ensure the benchmarks directory exists
    await ensureBenchmarksDir();

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const filenamePrefix = contextFile
      ? `benchmark-results-with-context-`
      : `benchmark-results-`;
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
      return result;
    });

    await fs.writeFile(filePath, JSON.stringify(resultsWithContext, null, 2));
    console.log(`📊 Saved benchmark results to ${filePath}`);

    return filePath;
  } catch (error) {
    console.error("Error saving benchmark results:", error);
    throw error;
  }
}
