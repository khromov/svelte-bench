import { startVitest } from "vitest/node";
import path from "path";
import { getTmpDir } from "./file";

export interface TestResult {
  testName: string;
  success: boolean;
  testFiles: number;
  totalTests: number;
  failedTests: number;
  errors: string[]; // All errors that occurred during test execution
}

/**
 * Run tests for a specific component
 * @param testName The name of the test
 * @param provider The provider name (optional)
 * @returns Test results
 */
export async function runTest(
  testName: string,
  provider?: string
): Promise<TestResult> {
  // Force exit if tests get stuck
  const forceExitTimeout = setTimeout(() => {
    console.error(
      `⚠️ TIMEOUT: Tests for ${testName} (${
        provider || "unknown"
      }) appear to be stuck. Forcing exit...`
    );
    process.exit(2);
  }, 60000); // 60 second timeout

  try {
    console.log(
      `🧪 Running tests for ${testName}${provider ? ` (${provider})` : ""}...`
    );

    const tmpDir = getTmpDir(provider);
    const testFilePath = path.resolve(tmpDir, `${testName}.test.ts`);

    const vitest = await startVitest("test", [testFilePath], {
      watch: false,
      reporters: ["verbose"],
    });

    await vitest.close();
    const testModules = vitest.state.getTestModules();

    // Cancel the force exit timeout
    clearTimeout(forceExitTimeout);

    // Collect all errors
    const allErrors: string[] = [];

    // Get unhandled errors
    const unhandledErrors = vitest.state.getUnhandledErrors();
    for (const error of unhandledErrors) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
        console.error(
          `Error processing module tests for ${testName}${
            provider ? ` (${provider})` : ""
          }:`,
          err
        );
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

    console.log(
      `📊 Test results for ${testName}${provider ? ` (${provider})` : ""}:`
    );
    console.log(`   Success: ${result.success ? "Yes ✅" : "No ❌"}`);
    console.log(`   Total Tests: ${result.totalTests}`);
    console.log(`   Failed Tests: ${result.failedTests}`);
    console.log(`   Errors: ${result.errors.length}`);

    return result;
  } catch (error) {
    // Cancel the force exit timeout
    clearTimeout(forceExitTimeout);

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error running tests for ${testName}${provider ? ` (${provider})` : ""}:`,
      errorMessage
    );

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
