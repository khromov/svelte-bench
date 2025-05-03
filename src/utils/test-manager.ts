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
  temperature: number = 0.7
): Promise<BenchmarkResult> {
  try {
    // Read the prompt
    const prompt = await readFile(test.promptPath);

    // Generate code with the LLM
    console.log(
      `🔄 Generating ${test.name} component with ${llmProvider.name} (sample ${
        sampleIndex + 1
      }, temp: ${temperature})...`
    );
    let generatedCode = await llmProvider.generateCode(prompt, temperature);

    // Apply a second pass of cleaning to ensure all backticks are removed
    generatedCode = cleanCodeMarkdown(generatedCode);

    // Check if the generated code already includes <svelte:options runes={true} />
    if (!generatedCode.includes("<svelte:options runes={true} />")) {
      // Prepend it to the generated code
      generatedCode = "<svelte:options runes={true} />\n\n" + generatedCode;
    }

    // Write the generated code to a single file - always use "Component.svelte"
    const componentFilename = "Component.svelte";
    await writeToTmpFile(componentFilename, generatedCode);

    // Copy the test file to the tmp directory - no modifications to test files
    const testContent = await readFile(test.testPath);
    const testFilename = `${test.name}.test.ts`;
    await writeToTmpFile(testFilename, testContent);

    // Run the test
    const testResult = await runTest(test.name);

    return {
      testName: test.name,
      llmProvider: llmProvider.name,
      modelIdentifier: llmProvider.getModelIdentifier(),
      generatedCode,
      testResult,
      promptPath: test.promptPath,
      timestamp: new Date().toISOString(),
      sampleIndex,
      temperature,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error running test ${test.name}:`, errorMessage);

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
  numSamples: number = 10
): Promise<HumanEvalResult> {
  try {
    const samples: BenchmarkResult[] = [];

    // Use temperature of 0.2 for pass@1 calculations
    // and temperature of 0.8 for the rest of the samples
    // This aligns with recommendations from the original HumanEval paper

    // First sample with temperature 0.2 (for pass@1)
    const firstSample = await runSingleTest(test, llmProvider, 0, 0.2);
    samples.push(firstSample);

    // Remaining samples with temperature 0.8 (for pass@k where k>1)
    for (let i = 1; i < numSamples; i++) {
      // Clean the tmp directory before each sample
      await cleanTmpDir();

      // Run the test with the current sample index and higher temperature
      const result = await runSingleTest(test, llmProvider, i, 0.8);
      samples.push(result);
    }

    // Calculate pass@k metrics
    const numCorrect = samples.filter((s) => s.testResult.success).length;
    const pass1 = calculatePassAtK(numSamples, numCorrect, 1);
    const pass10 = calculatePassAtK(
      numSamples,
      numCorrect,
      Math.min(10, numSamples)
    );

    // Format the results
    return {
      testName: test.name,
      provider: llmProvider.name,
      modelId: llmProvider.getModelIdentifier(),
      numSamples,
      numCorrect,
      pass1,
      pass10,
      samples: samples.map((s) => ({
        index: s.sampleIndex || 0,
        code: s.generatedCode,
        success: s.testResult.success,
        errors: s.testResult.errors || [],
        temperature: s.temperature,
      })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error running HumanEval test ${test.name}:`, errorMessage);

    // Return a failed result
    return {
      testName: test.name,
      provider: llmProvider.name,
      modelId: llmProvider.getModelIdentifier(),
      numSamples,
      numCorrect: 0,
      pass1: 0,
      pass10: 0,
      samples: [
        {
          index: 0,
          code: "",
          success: false,
          errors: [errorMessage],
          temperature: 0.2,
        },
      ],
    };
  }
}

/**
 * Run all tests with the given LLM provider using HumanEval methodology
 */
export async function runAllTestsHumanEval(
  llmProvider: LLMProvider,
  numSamples: number = 10
): Promise<HumanEvalResult[]> {
  try {
    // Clean the tmp directory
    await cleanTmpDir();

    // Load all test definitions
    const tests = await loadTestDefinitions();
    console.log(`📋 Found ${tests.length} tests to run`);

    // Run each test in sequence
    const results: HumanEvalResult[] = [];

    for (const test of tests) {
      // Clean the tmp directory before each test
      await cleanTmpDir();

      console.log(`\n🧪 Running test: ${test.name}`);
      const result = await runHumanEvalTest(test, llmProvider, numSamples);
      results.push(result);

      // Log the pass@k metrics
      console.log(
        `📊 ${test.name} - pass@1: ${result.pass1.toFixed(
          4
        )}, pass@10: ${result.pass10.toFixed(4)}`
      );
      console.log(
        `   Samples: ${result.numSamples}, Correct: ${result.numCorrect}`
      );
    }

    return results;
  } catch (error) {
    console.error("Error running all tests:", error);
    throw error;
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
  results: HumanEvalResult[]
): Promise<string> {
  try {
    // Ensure the benchmarks directory exists
    await ensureBenchmarksDir();

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const filename = `benchmark-results-${timestamp}.json`;
    const filePath = path.resolve(process.cwd(), "benchmarks", filename);

    await fs.writeFile(filePath, JSON.stringify(results, null, 2));
    console.log(`📊 Saved benchmark results to ${filePath}`);

    return filePath;
  } catch (error) {
    console.error("Error saving benchmark results:", error);
    throw error;
  }
}
