import path from "path";
import fs from "fs/promises";
import type { LLMProvider } from "../llms";
import { cleanTmpDir, writeToTmpFile, readFile } from "./file";
import { runTest } from "./test-runner";
import type { TestResult } from "./test-runner";

export interface TestDefinition {
  name: string;
  promptPath: string;
  testPath: string;
}

export interface BenchmarkResult {
  testName: string;
  llmProvider: string;
  modelIdentifier: string;
  generatedCode: string;
  testResult: TestResult;
  promptPath: string;
  timestamp: string;
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
 * Run a single test with the given LLM provider
 */
export async function runSingleTest(
  test: TestDefinition,
  llmProvider: LLMProvider
): Promise<BenchmarkResult> {
  try {
    // Read the prompt
    const prompt = await readFile(test.promptPath);

    // Generate code with the LLM
    console.log(
      `🔄 Generating ${test.name} component with ${llmProvider.name}...`
    );
    let generatedCode = await llmProvider.generateCode(prompt);

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
    };
  }
}

/**
 * Run all tests with the given LLM provider
 */
export async function runAllTests(
  llmProvider: LLMProvider
): Promise<BenchmarkResult[]> {
  try {
    // Clean the tmp directory
    await cleanTmpDir();

    // Load all test definitions
    const tests = await loadTestDefinitions();
    console.log(`📋 Found ${tests.length} tests to run`);

    // Run each test in sequence
    const results: BenchmarkResult[] = [];

    for (const test of tests) {
      // Clean the tmp directory before each test
      await cleanTmpDir();

      console.log(`\n🧪 Running test: ${test.name}`);
      const result = await runSingleTest(test, llmProvider);
      results.push(result);
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
  results: BenchmarkResult[]
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
