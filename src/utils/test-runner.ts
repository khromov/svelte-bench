import { createVitest, type TestModule } from "vitest/node";
import path from "path";
import { getTmpDir } from "./file";
import fs from "fs/promises";

export interface TestResult {
  testName: string;
  success: boolean;
  testFiles: number;
  totalTests: number;
  failedTests: number;
  errors: string[]; // All errors that occurred during test execution
}

interface VitestRunResult {
  testModules: TestModule[];
  unhandledErrors: unknown[];
}

interface VitestWorker {
  vitest: Awaited<ReturnType<typeof createVitest>>;
  busy: boolean;
}

/**
 * Vitest startup is relatively expensive. Keep one isolated Vitest instance
 * per concurrent sample and reuse it for the lifetime of the benchmark run.
 * The instances are still isolated from one another, so this does not change
 * test execution or module state semantics.
 */
class VitestWorkerPool {
  private readonly workers: VitestWorker[] = [];
  private readonly waiters: Array<(worker: VitestWorker) => void> = [];
  private initialized = false;
  private closing = false;
  private previousMaxListeners: number | undefined;

  async initialize(size: number): Promise<void> {
    if (this.initialized) return;

    this.initialized = true;
    this.previousMaxListeners = process.getMaxListeners();
    if (this.previousMaxListeners > 0) {
      process.setMaxListeners(Math.max(this.previousMaxListeners, size + 1));
    }
    try {
      await Promise.all(
        Array.from({ length: size }, async () => {
          const vitest = await createVitest("test", {
            run: false,
            watch: false,
            reporters: ["verbose"],
          });
          await vitest.init();
          this.workers.push({ vitest, busy: false });
        })
      );
    } catch (error) {
      await Promise.allSettled(this.workers.map(({ vitest }) => vitest.close()));
      this.workers.length = 0;
      this.initialized = false;
      if (this.previousMaxListeners !== undefined) {
        process.setMaxListeners(this.previousMaxListeners);
        this.previousMaxListeners = undefined;
      }
      throw error;
    }
  }

  async run(testFilePath: string): Promise<VitestRunResult> {
    if (this.closing) {
      throw new Error("Vitest worker pool is closing");
    }

    const worker = await this.acquire();
    try {
      const specifications = await worker.vitest.getRelevantTestSpecifications([testFilePath]);
      if (specifications.length === 0) {
        return { testModules: [], unhandledErrors: [] };
      }

      return await worker.vitest.runTestSpecifications(specifications);
    } finally {
      this.release(worker);
    }
  }

  async close(): Promise<void> {
    this.closing = true;
    await Promise.all(this.workers.map(({ vitest }) => vitest.close()));
    this.workers.length = 0;
    this.initialized = false;
    this.closing = false;
    if (this.previousMaxListeners !== undefined) {
      process.setMaxListeners(this.previousMaxListeners);
      this.previousMaxListeners = undefined;
    }
  }

  private async acquire(): Promise<VitestWorker> {
    const availableWorker = this.workers.find((worker) => !worker.busy);
    if (availableWorker) {
      availableWorker.busy = true;
      return availableWorker;
    }

    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private release(worker: VitestWorker): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(worker);
    } else {
      worker.busy = false;
    }
  }
}

const vitestWorkerPool = new VitestWorkerPool();
let vitestPoolInitialization: Promise<void> | undefined;

function getVitestWorkerPool(): Promise<void> {
  if (!vitestPoolInitialization) {
    // Match Vitest's startVitest preparation step. These flags are used by
    // Vite/Svelte integrations when selecting the client test environment.
    process.env.TEST = "true";
    process.env.VITEST = "true";
    process.env.NODE_ENV ??= "test";

    // Ten is the existing maximum number of concurrent samples. This keeps
    // the pool bounded without reducing the current parallelism.
    vitestPoolInitialization = vitestWorkerPool.initialize(10).catch((error) => {
      vitestPoolInitialization = undefined;
      throw error;
    });
  }

  return vitestPoolInitialization;
}

/** Close reusable Vitest workers after the benchmark has finished. */
export async function closeTestRunnerPool(): Promise<void> {
  if (!vitestPoolInitialization) return;
  await vitestPoolInitialization;
  await vitestWorkerPool.close();
  vitestPoolInitialization = undefined;
}

/**
 * Run tests for a specific component
 * @param testName The name of the test
 * @param provider The provider name (optional)
 * @param testDir Optional specific directory for test files (for parallel execution)
 * @returns Test results
 */
export async function runTest(testName: string, provider?: string, testDir?: string): Promise<TestResult> {
  // Create timeout error message
  const timeoutMessage = `Test timeout: ${testName} (${
    provider || "unknown"
  }) exceeded the maximum execution time of 120 seconds`;

  // Create an AbortController for the timeout
  const abortController = new AbortController();
  const signal = abortController.signal;

  // Use a timeout promise to avoid forcing the process to exit
  const timeoutPromise = new Promise<TestResult>((_, reject) => {
    const timeoutId = setTimeout(() => {
      console.error(`⚠️ ${timeoutMessage}`);
      // Instead of process.exit, we'll reject with a clear error
      abortController.abort(); // Signal abortion to potentially listening handlers
      reject(new Error(timeoutMessage));
    }, 120000); // Increase to 120 second timeout for parallel execution

    // Make sure the timeout is cleared if the promise is rejected/resolved elsewhere
    signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
    });
  });

  try {
    console.log(`🧪 Running tests for ${testName}${provider ? ` (${provider})` : ""}...`);

    const tmpDir = testDir || getTmpDir(provider);
    const testFilePath = path.resolve(tmpDir, `${testName}.test.ts`);

    // Verify the test file exists before running the test
    try {
      await fs.access(testFilePath);
    } catch (error) {
      abortController.abort(); // Clean up the timeout
      throw new Error(`Test file not found: ${testFilePath}`);
    }

    // Race between the test execution and the timeout
    const testPromise = async (): Promise<TestResult> => {
      try {
        await getVitestWorkerPool();
        const { testModules, unhandledErrors } = await vitestWorkerPool.run(testFilePath);

        // Collect all errors
        const allErrors: string[] = [];

        // Get unhandled errors
        for (const error of unhandledErrors) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          allErrors.push(errorMessage);
        }

        // Calculate success/failure
        let success = true;
        let totalTests = 0;
        let failedTests = 0;

        if (!testModules || testModules.length === 0) {
          return {
            testName,
            success: false,
            testFiles: 0,
            totalTests: 0,
            failedTests: 0,
            errors: allErrors,
          };
        }

        for (const module of testModules) {
          if (!module.ok()) {
            success = false;
          }

          // Add module errors
          const moduleErrors = module.errors();
          for (const error of moduleErrors) {
            if (error.message) {
              allErrors.push(error.message);
            }
          }

          if (!module.children) {
            continue;
          }

          try {
            const tests = Array.from(module.children.allTests());
            totalTests += tests.length;

            const moduleFailedTests = tests.filter((t) => {
              const result = t.result();

              // Collect test errors
              if (result.state === "failed" && result.errors) {
                for (const testError of result.errors) {
                  if (testError.message) {
                    allErrors.push(testError.message);
                  }
                }
              }

              return result.state === "failed";
            });

            failedTests += moduleFailedTests.length;
          } catch (err) {
            console.error(`Error processing module tests for ${testName}${provider ? ` (${provider})` : ""}:`, err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            allErrors.push(errorMessage);
            success = false;
          }
        }

        const result: TestResult = {
          testName,
          success,
          testFiles: testModules.length,
          totalTests,
          failedTests,
          errors: allErrors,
        };

        console.log(`📊 Test results for ${testName}${provider ? ` (${provider})` : ""}:`);
        console.log(`   Success: ${result.success ? "Yes ✅" : "No ❌"}`);
        console.log(`   Total Tests: ${result.totalTests}`);
        console.log(`   Failed Tests: ${result.failedTests}`);
        console.log(`   Errors: ${result.errors.length}`);

        return result;
      } finally {
        // Always abort the controller to clean up the timeout
        abortController.abort();
      }
    };

    // Race the test execution against the timeout
    return await Promise.race([testPromise(), timeoutPromise]);
  } catch (error) {
    // Make sure to abort the controller to clean up the timeout
    abortController.abort();

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error running tests for ${testName}${provider ? ` (${provider})` : ""}:`, errorMessage);

    return {
      testName,
      success: false,
      testFiles: 0,
      totalTests: 0,
      failedTests: 0,
      errors: [errorMessage],
    };
  }
}
