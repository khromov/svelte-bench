import path from "path";
import fs from "fs/promises";
import type { LLMProvider } from "../llms";
import { cleanTmpDir, cleanCheckpointDir, writeToTmpFile, readFile, saveCheckpoint, loadCheckpoint, removeCheckpoint } from "./file";
import { runTest } from "./test-runner";
import type { TestResult } from "./test-runner";
import { calculatePassAtK, type HumanEvalResult } from "./humaneval";
import { cleanCodeMarkdown } from "./code-cleaner";
import { withRetry } from "./retry-wrapper";
import crypto from "crypto";

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
 * Get a unique directory for a test/sample combination to avoid conflicts
 */
function getUniqueTestDir(providerName: string, testName: string, sampleIndex: number): string {
  const uniqueId = crypto.randomBytes(4).toString('hex');
  return path.resolve(
    process.cwd(),
    "tmp",
    "samples",
    providerName.toLowerCase(),
    `${testName}_sample${sampleIndex}_${uniqueId}`
  );
}

/**
 * Write files to a unique directory for a test/sample combination
 */
async function writeToUniqueTestDir(
  dir: string,
  filename: string,
  content: string
): Promise<string> {
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content);
  console.log(`📝 Wrote to ${filePath}`);
  return filePath;
}

/**
 * Clean up a unique test directory
 */
async function cleanUniqueTestDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist, that's fine
  }
}

/**
 * Run a single test sample with proper isolation
 */
async function runSingleTestSample(
  test: TestDefinition,
  llmProvider: LLMProvider,
  sampleIndex: number,
  temperature: number | undefined,
  contextContent?: string
): Promise<BenchmarkResult> {
  const providerName = llmProvider.name;
  const testDir = getUniqueTestDir(providerName, test.name, sampleIndex);

  try {
    // Read the prompt
    const prompt = await readFile(test.promptPath);

    // Generate code with the LLM (quiet mode for parallel execution)
    // Only log for first sample to reduce output noise
    if (sampleIndex === 0) {
      console.log(
        `🔄 Generating ${test.name} component with ${providerName} (${sampleIndex + 1} of multiple samples)...`
      );
    }
    
    let generatedCode = await withRetry(
      async () => {
        const rawCode = await llmProvider.generateCode(prompt, temperature, contextContent);
        const cleanedCode = cleanCodeMarkdown(rawCode);
        
        if (!cleanedCode.trim()) {
          console.warn(`⚠️ Generated code is empty after cleaning for ${test.name} with ${providerName}`);
          throw new Error("Generated code is empty after cleaning");
        }
        
        return cleanedCode;
      },
      {
        onRetry: (error, attempt) => {
          console.warn(
            `⚠️  Retry attempt ${attempt} for ${test.name} with ${providerName} after error: ${error.message}`
          );
        },
      }
    );

    // Add runes if not present
    if (!generatedCode.includes("<svelte:options runes={true} />")) {
      generatedCode = "<svelte:options runes={true} />\n\n" + generatedCode;
    }

    // Write files to unique directory (suppress file write logs in parallel mode)
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(path.join(testDir, "Component.svelte"), generatedCode);
    
    const testContent = await readFile(test.testPath);
    await fs.writeFile(path.join(testDir, `${test.name}.test.ts`), testContent);

    // Run the test with the unique directory
    const testResult = await runTest(test.name, providerName, testDir);

    // Clean up the unique directory
    await cleanUniqueTestDir(testDir);

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
    // Clean up on error
    await cleanUniqueTestDir(testDir);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error running test ${test.name} sample ${sampleIndex} with ${llmProvider.name}:`,
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
 * Run all samples for a single test in parallel
 */
async function runTestSamplesParallel(
  test: TestDefinition,
  llmProvider: LLMProvider,
  numSamples: number,
  contextContent?: string
): Promise<BenchmarkResult[]> {
  const samplePromises: Promise<BenchmarkResult>[] = [];
  
  for (let i = 0; i < numSamples; i++) {
    const temperature = i === 0 ? 0 : undefined;
    samplePromises.push(
      runSingleTestSample(test, llmProvider, i, temperature, contextContent)
    );
  }
  
  const results = await Promise.all(samplePromises);
  return results.filter(r => r.generatedCode.trim() !== "");
}

/**
 * Run a single test with multiple samples using parallel execution
 */
export async function runHumanEvalTest(
  test: TestDefinition,
  llmProvider: LLMProvider,
  numSamples: number = 10,
  contextContent?: string
): Promise<HumanEvalResult> {
  try {
    const providerName = llmProvider.name;
    const modelId = llmProvider.getModelIdentifier();
    
    console.log(`🧪 Running test: ${test.name} with ${providerName} (${numSamples} samples in parallel)`);
    
    // Run all samples in parallel
    const samples = await runTestSamplesParallel(test, llmProvider, numSamples, contextContent);
    
    // Show completion status
    const successCount = samples.filter(s => s.testResult.success).length;
    console.log(`   ✅ Completed ${samples.length}/${numSamples} samples (${successCount} passed)`);
    
    // Calculate metrics
    const validSamples = samples.filter((s) => s !== null && s !== undefined);
    const numValidSamples = validSamples.length;
    const numCorrect = validSamples.filter((s) => s.testResult.success).length;

    if (numValidSamples === 0) {
      return {
        testName: test.name,
        provider: providerName,
        modelId,
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

    return {
      testName: test.name,
      provider: providerName,
      modelId,
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
 * Run all tests in parallel with the given LLM provider
 */
export async function runAllTestsHumanEval(
  llmProvider: LLMProvider,
  numSamples: number = 10,
  specificTests?: TestDefinition[],
  contextContent?: string
): Promise<HumanEvalResult[]> {
  try {
    const providerName = llmProvider.name;
    const modelId = llmProvider.getModelIdentifier();

    // Load test definitions
    let tests: TestDefinition[];
    if (specificTests && specificTests.length > 0) {
      tests = specificTests;
      console.log(
        `📋 Running ${tests.length} specific tests for ${providerName} in parallel`
      );
    } else {
      tests = await loadTestDefinitions();
      console.log(`📋 Found ${tests.length} tests to run for ${providerName} in parallel`);
    }

    // Clear checkpoints for new runs
    await cleanCheckpointDir(providerName);

    // Run all tests in parallel
    const testPromises = tests.map(test => 
      runHumanEvalTest(test, llmProvider, numSamples, contextContent)
    );

    const results = await Promise.all(testPromises);

    // Filter out empty results and log metrics in a compact format
    const validResults = results.filter(r => r.numSamples > 0);
    
    console.log(`\n📊 Results for ${providerName}:`);
    for (const result of validResults) {
      console.log(
        `   ${result.testName}: pass@1=${result.pass1.toFixed(3)}, pass@10=${result.pass10.toFixed(3)} (${result.numCorrect}/${result.numSamples})`
      );
    }

    return validResults;
  } catch (error) {
    console.error(`Error running all tests for ${llmProvider.name}:`, error);
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
  customFilenamePrefix?: string
): Promise<string> {
  try {
    await ensureBenchmarksDir();

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    let filenamePrefix: string;
    
    if (customFilenamePrefix) {
      const cleanPrefix = customFilenamePrefix.replace(/[^a-zA-Z0-9\-_]/g, '-');
      filenamePrefix = contextFile
        ? `benchmark-results-with-context-${cleanPrefix}-`
        : `benchmark-results-${cleanPrefix}-`;
    } else {
      filenamePrefix = contextFile
        ? `benchmark-results-with-context-`
        : `benchmark-results-`;
    }
    
    const filename = `${filenamePrefix}${timestamp}.json`;
    const filePath = path.resolve(process.cwd(), "benchmarks", filename);

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