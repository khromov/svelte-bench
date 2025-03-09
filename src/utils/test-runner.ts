import { startVitest } from "vitest/node";
import path from "path";
import { TMP_DIR } from "./file";

export interface TestResult {
  testName: string;
  success: boolean;
  testFiles: number;
  totalTests: number;
  failedTests: number;
  error?: string;
}

/**
 * Run tests for a specific component
 * @param testName The name of the test
 * @returns Test results
 */
export async function runTest(testName: string): Promise<TestResult> {
  // Force exit if tests get stuck
  const forceExitTimeout = setTimeout(() => {
    console.error(
      `⚠️ TIMEOUT: Tests for ${testName} appear to be stuck. Forcing exit...`
    );
    process.exit(2);
  }, 60000); // 60 second timeout

  try {
    console.log(`🧪 Running tests for ${testName}...`);

    const testFilePath = path.resolve(TMP_DIR, `${testName}.test.ts`);

    const vitest = await startVitest("test", [testFilePath], {
      watch: false,
      reporters: ["verbose"],
    });

    await vitest.close();
    const testModules = vitest.state.getTestModules();

    // Cancel the force exit timeout
    clearTimeout(forceExitTimeout);

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
        error: "No test modules found",
      };
    }

    for (const module of testModules) {
      if (!module.ok()) {
        success = false;
      }

      if (!module.children) {
        continue;
      }

      try {
        const tests = Array.from(module.children.allTests());
        totalTests += tests.length;

        const moduleFailedTests = tests.filter((t) => {
          const result = t.result();
          return result.state === "failed";
        });

        failedTests += moduleFailedTests.length;
      } catch (err) {
        console.error(`Error processing module tests for ${testName}:`, err);
        success = false;
      }
    }

    const result: TestResult = {
      testName,
      success,
      testFiles: testModules.length,
      totalTests,
      failedTests,
    };

    console.log(`📊 Test results for ${testName}:`);
    console.log(`   Success: ${result.success ? "Yes ✅" : "No ❌"}`);
    console.log(`   Total Tests: ${result.totalTests}`);
    console.log(`   Failed Tests: ${result.failedTests}`);

    return result;
  } catch (error) {
    // Cancel the force exit timeout
    clearTimeout(forceExitTimeout);

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error running tests for ${testName}:`, errorMessage);

    return {
      testName,
      success: false,
      testFiles: 0,
      totalTests: 0,
      failedTests: 0,
      error: errorMessage,
    };
  }
}
