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
 * Run all samples for a single test in parallel with checkpointing
 */
async function runTestSamplesInParallelWithCheckpointing(
  test: TestDefinition,
  llmProvider: LLMProvider,
  numSamples: number,
  contextContent?: string,
  testIndex?: number,
  completedResults?: HumanEvalResult[],
  existingSamples: BenchmarkResult[] = [],
  startSampleIndex: number = 0
): Promise<BenchmarkResult[]> {
  const providerName = llmProvider.name;
  const modelId = llmProvider.getModelIdentifier();
  const samples: BenchmarkResult[] = [...existingSamples];
  
  // Create promises for remaining samples to run in parallel
  const samplePromises: Promise<{index: number, result: BenchmarkResult}>[] = [];
  
  for (let i = startSampleIndex; i < numSamples; i++) {
    const temperature = i === 0 ? 0 : undefined;
    const sampleIndex = i;
    
    const samplePromise = runSingleTestSample(test, llmProvider, sampleIndex, temperature, contextContent)
      .then(result => ({ index: sampleIndex, result }))
      .catch(error => {
        console.error(`Error running sample ${sampleIndex + 1} for ${test.name}:`, error);
        // Return a failed result
        return {
          index: sampleIndex,
          result: {
            testName: test.name,
            llmProvider: providerName,
            modelIdentifier: llmProvider.getModelIdentifier(),
            generatedCode: "",
            testResult: {
              testName: test.name,
              success: false,
              testFiles: 0,
              totalTests: 0,
              failedTests: 0,
              errors: [error instanceof Error ? error.message : String(error)],
            },
            promptPath: test.promptPath,
            contextContent,
            timestamp: new Date().toISOString(),
            sampleIndex,
            temperature,
          }
        };
      });
    
    samplePromises.push(samplePromise);
  }
  
  if (samplePromises.length === 0) {
    return samples;
  }
  
  console.log(`🔄 Running ${samplePromises.length} samples in parallel for ${test.name}...`);
  
  // Wait for all samples to complete and process them as they finish
  const completedSamples = await Promise.all(samplePromises);
  
  // Sort by index to maintain order
  completedSamples.sort((a, b) => a.index - b.index);
  
  // Process each completed sample and save checkpoint
  for (const { index, result } of completedSamples) {
    // Only add to samples if the API call was successful (has generated code)
    if (result.generatedCode.trim() !== "") {
      samples.push(result);
      console.log(`✅ Completed sample ${index + 1}/${numSamples} for ${test.name}`);
    } else {
      console.log(`⚠️ API failure for sample ${index + 1}/${numSamples} for ${test.name} - not adding to results`);
    }

    // Save checkpoint after each sample completion (if we have the required context)
    if (testIndex !== undefined && completedResults !== undefined) {
      const checkpointData: CheckpointData = {
        modelId,
        provider: providerName,
        completedResults,
        currentTestIndex: testIndex,
        currentSampleIndex: index,
        currentTestSamples: samples,
        contextContent,
        numSamples,
        timestamp: new Date().toISOString(),
      };
      await saveCheckpoint(providerName, modelId, checkpointData);
      console.log(`💾 Saved checkpoint after sample ${index + 1}/${numSamples}`);
    }
  }
  
  return samples.filter(r => r.generatedCode.trim() !== "");
}

/**
 * Run a single test with multiple samples using parallel execution
 */
export async function runHumanEvalTest(
  test: TestDefinition,
  llmProvider: LLMProvider,
  numSamples: number = 10,
  contextContent?: string,
  testIndex?: number,
  completedResults?: HumanEvalResult[],
  existingSamples: BenchmarkResult[] = [],
  startSampleIndex: number = 0
): Promise<HumanEvalResult> {
  try {
    const providerName = llmProvider.name;
    const modelId = llmProvider.getModelIdentifier();
    
    if (startSampleIndex === 0 && existingSamples.length === 0) {
      console.log(`🧪 Running test: ${test.name} with ${providerName} (${numSamples} samples with checkpointing)`);
    } else {
      console.log(`🔄 Resuming test: ${test.name} with ${providerName} from sample ${startSampleIndex + 1}/${numSamples} (${existingSamples.length} existing samples)`);
    }
    
    // Run samples in parallel with checkpointing
    const samples = await runTestSamplesInParallelWithCheckpointing(
      test, 
      llmProvider, 
      numSamples, 
      contextContent,
      testIndex,
      completedResults,
      existingSamples,
      startSampleIndex
    );
    
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
        `📋 Running ${tests.length} specific tests for ${providerName} with sample-level checkpointing`
      );
    } else {
      tests = await loadTestDefinitions();
      console.log(`📋 Found ${tests.length} tests to run for ${providerName} with sample-level checkpointing`);
    }

    // Check for existing checkpoint and resume if possible
    const checkpoint = await loadCheckpoint(providerName, modelId);
    let results: HumanEvalResult[] = [];
    let startTestIndex = 0;
    let startSampleIndex = 0;
    let currentTestSamples: BenchmarkResult[] = [];

    if (checkpoint) {
      console.log(`🔄 Found checkpoint for ${providerName}/${modelId}`);
      console.log(`🔄 Resuming from checkpoint at test ${checkpoint.currentTestIndex + 1}/${tests.length}, sample ${checkpoint.currentSampleIndex + 1}`);
      
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
    } else {
      // Clear checkpoints at the beginning for new runs
      await cleanCheckpointDir(providerName);
    }

    // Run remaining tests from checkpoint or start
    for (let i = startTestIndex; i < tests.length; i++) {
      const test = tests[i];
      
      try {
        console.log(`\n🧪 Running test: ${test.name} with ${providerName} (${i + 1}/${tests.length})`);
        
        // Determine starting sample index (0 for new tests, checkpoint value for resumed tests)
        const sampleStartIndex = (i === startTestIndex) ? startSampleIndex : 0;
        const existingSamples = (i === startTestIndex) ? currentTestSamples : [];
        
        // Run the test with sample-level checkpointing
        const result = await runHumanEvalTest(
          test,
          llmProvider,
          numSamples,
          contextContent,
          i,
          results,
          existingSamples,
          sampleStartIndex
        );
        
        // Only add result if it has valid samples (not just API failures)
        if (result.numSamples > 0) {
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
        console.error(
          `Error running test ${test.name} with ${providerName}:`,
          error
        );
        
        // If this was due to retry exhaustion, abort the entire run
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Failed after')) {
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

    // Filter out empty results and log metrics in a compact format
    const validResults = results.filter(r => r.numSamples > 0);
    
    console.log(`\n📊 Results for ${providerName}:`);
    for (const result of validResults) {
      console.log(
        `   ${result.testName}: pass@1=${result.pass1.toFixed(3)}, pass@10=${result.pass10.toFixed(3)} (${result.numCorrect}/${result.numSamples})`
      );
    }

    // Clean up checkpoint after successful completion
    await removeCheckpoint(providerName, modelId);

    return validResults;
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