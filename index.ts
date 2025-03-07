// run-counter-tests.js
import { startVitest } from "vitest/node";
import { resolve } from "path";

async function runCounterTests() {
  console.log("Starting Counter component tests...");

  // Start Vitest programmatically with run mode enabled
  const vitest = await startVitest(
    "test",
    // CLI filters - specify the path to the Counter test file
    [resolve(process.cwd(), "./Counter.test.js")],
    // CLI options
    {
      watch: false, // Disable watch mode
      reporters: ["verbose"], // Use verbose reporter for more details
    }
  );

  // In run mode, Vitest will automatically call close() when tests are complete
  // But we need to wait for the running promise to complete
  try {
    // Wait for tests to finish completely
    await vitest.close();

    // Get test results
    const testModules = vitest.state.getTestModules();

    // Calculate success/failure
    let success = true;
    let totalTests = 0;
    let failedTests = 0;

    for (const module of testModules) {
      if (!module.ok()) {
        success = false;
      }

      // Convert the generator to an array to count tests
      const tests = Array.from(module.children.allTests());
      totalTests += tests.length;

      // Count failed tests
      failedTests += tests.filter((t) => t.result().state === "failed").length;
    }

    return {
      success,
      testFiles: testModules.length,
      totalTests,
      failedTests,
    };
  } catch (error: any) {
    console.error("Error during test execution:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the tests and log results
runCounterTests()
  .then((results) => {
    console.log("\n=== TEST SUMMARY ===");
    console.log(`Success: ${results.success ? "Yes ✅" : "No ❌"}`);
    console.log(`Files:   ${results.testFiles || 0}`);
    console.log(`Tests:   ${results.totalTests || 0}`);
    console.log(`Failures: ${results.failedTests || 0}`);

    // Exit with appropriate code
    process.exit(results.success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Error running tests:", err);
    process.exit(1);
  });
