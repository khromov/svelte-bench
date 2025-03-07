import { startVitest, createVitest } from "vitest/node";
import { resolve } from "path";

/**
 * Run Counter component tests with extensive debugging
 * @param {string} method - Which method to use: 'start' (default) or 'create'
 */
async function runCounterTests(method = "start") {
  // Force exit if tests get stuck (safety mechanism)
  const forceExitTimeout = setTimeout(() => {
    console.error("⚠️ TIMEOUT: Tests appear to be stuck. Forcing exit...");
    process.exit(2);
  }, 60000); // 60 second timeout

  try {
    const testFilePath = resolve(process.cwd(), "./Counter.test.ts");
    let vitest;
    let testModules;

    if (method === "start") {
      vitest = await startVitest("test", [testFilePath], {
        watch: false,
        reporters: ["verbose"],
      });
      await vitest.close();
      testModules = vitest.state.getTestModules();
    } else if (method === "create") {
      vitest = await createVitest("test", {
        watch: false,
        reporters: ["verbose"],
      });
      const result = await vitest.start([testFilePath]);
      testModules = result.testModules || vitest.state.getTestModules();
      await vitest.close();
    } else {
      throw new Error(`Unknown method: ${method}`);
    }

    // Cancel the force exit timeout since we made it this far
    clearTimeout(forceExitTimeout);

    // Calculate success/failure
    let success = true;
    let totalTests = 0;
    let failedTests = 0;

    if (!testModules || testModules.length === 0) {
      return {
        success: false,
        testFiles: 0,
        totalTests: 0,
        failedTests: 0,
        message: "No test modules found",
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
        console.error("Error processing module tests:", err);
        success = false;
      }
    }

    return {
      success,
      testFiles: testModules.length,
      totalTests,
      failedTests,
    };
  } catch (error) {
    console.error("Error during test execution:", error);

    // Cancel the force exit timeout
    clearTimeout(forceExitTimeout);

    return {
      success: false,
      error: error.message || String(error),
      stack: error.stack,
    };
  }
}

// Run the tests with the 'start' method first
runCounterTests("start")
  .then((results) => {
    console.log("=== TEST SUMMARY ===");
    console.log(`Success: ${results.success ? "Yes ✅" : "No ❌"}`);
    console.log(`Files: ${results.testFiles || 0}`);
    console.log(`Tests: ${results.totalTests || 0}`);
    console.log(`Failures: ${results.failedTests || 0}`);

    if (results.error) {
      console.log(`Error: ${results.error}`);
    }

    // Try the second method if the first one failed or had no tests
    if (!results.success || results.totalTests === 0) {
      console.log("Retrying with createVitest method...");
      return runCounterTests("create").then((createResults) => {
        console.log("=== TEST SUMMARY (retry) ===");
        console.log(`Success: ${createResults.success ? "Yes ✅" : "No ❌"}`);
        console.log(`Files: ${createResults.testFiles || 0}`);
        console.log(`Tests: ${createResults.totalTests || 0}`);
        console.log(`Failures: ${createResults.failedTests || 0}`);

        if (createResults.error) {
          console.log(`Error: ${createResults.error}`);
        }

        return createResults;
      });
    }

    return results;
  })
  .then((finalResults) => {
    // Exit with appropriate code based on final results
    const exitCode = finalResults.success ? 0 : 1;
    process.exit(exitCode);
  })
  .catch((err) => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
  });
