import { startVitest, createVitest } from "vitest/node";
import { resolve } from "path";

/**
 * Run Counter component tests with extensive debugging
 * @param {string} method - Which method to use: 'start' (default) or 'create'
 */
async function runCounterTests(method = "start") {
  console.log("==================================");
  console.log(`Starting Counter component tests using ${method} method...`);
  console.log("==================================");

  // Force exit if tests get stuck (safety mechanism)
  const forceExitTimeout = setTimeout(() => {
    console.error("\n⚠️ TIMEOUT: Tests appear to be stuck. Forcing exit...");
    process.exit(2);
  }, 60000); // 60 second timeout

  try {
    console.log("🔍 Resolving test file path...");
    const testFilePath = resolve(process.cwd(), "./Counter.test.js");
    console.log(`📁 Test file: ${testFilePath}`);

    let vitest;
    let testModules;

    if (method === "start") {
      console.log("\n🚀 Initializing Vitest using startVitest method...");
      vitest = await startVitest("test", [testFilePath], {
        watch: false,
        reporters: ["verbose"],
      });
      console.log("✅ Vitest instance created successfully");

      console.log("\n📊 Checking Vitest state BEFORE closing...");
      console.log(`   - Phase: ${vitest.state.getPhase()}`);
      const pendingModules = vitest.state.getTestModules();
      console.log(`   - Test modules found: ${pendingModules.length}`);

      console.log("\n⏱️ Waiting for tests to complete...");
      console.log("   Calling vitest.close()...");
      await vitest.close();
      console.log("✅ vitest.close() completed");

      console.log("\n📊 Checking Vitest state AFTER closing...");
      testModules = vitest.state.getTestModules();
      console.log(`   - Test modules: ${testModules.length}`);
    } else if (method === "create") {
      console.log("\n🚀 Initializing Vitest using createVitest method...");
      vitest = await createVitest("test", {
        watch: false,
        reporters: ["verbose"],
      });
      console.log("✅ Vitest instance created successfully");

      console.log("\n🏃 Explicitly starting tests...");
      const result = await vitest.start([testFilePath]);
      console.log("✅ vitest.start() completed");

      console.log("\n📊 Checking Vitest state after running tests...");
      testModules = result.testModules || vitest.state.getTestModules();
      console.log(`   - Test modules: ${testModules.length}`);

      console.log("\n⏱️ Closing Vitest instance...");
      await vitest.close();
      console.log("✅ vitest.close() completed");
    } else {
      throw new Error(`Unknown method: ${method}`);
    }

    // Cancel the force exit timeout since we made it this far
    clearTimeout(forceExitTimeout);

    // Calculate success/failure
    console.log("\n📝 Processing test results...");
    let success = true;
    let totalTests = 0;
    let failedTests = 0;

    if (!testModules || testModules.length === 0) {
      console.warn(
        "⚠️ No test modules found! Tests might not have run properly."
      );
      return {
        success: false,
        testFiles: 0,
        totalTests: 0,
        failedTests: 0,
        message: "No test modules found",
      };
    }

    for (const module of testModules) {
      console.log(`   - Processing module: ${module.moduleId}`);
      console.log(`     State: ${module.state()}`);

      if (!module.ok()) {
        success = false;
        console.log(`     ❌ Module failed`);
      }

      if (!module.children) {
        console.warn(`     ⚠️ No children found in module!`);
        continue;
      }

      try {
        const tests = Array.from(module.children.allTests());
        console.log(`     Found ${tests.length} tests`);

        totalTests += tests.length;

        const moduleFailedTests = tests.filter((t) => {
          const result = t.result();
          console.log(`       Test: ${t.name}, State: ${result.state}`);
          return result.state === "failed";
        });

        failedTests += moduleFailedTests.length;

        if (moduleFailedTests.length > 0) {
          console.log(
            `     ❌ ${moduleFailedTests.length} tests failed in this module`
          );
        }
      } catch (err) {
        console.error(`     ❌ Error processing module tests:`, err);
        success = false;
      }
    }

    console.log("\n✅ Test processing completed");

    return {
      success,
      testFiles: testModules.length,
      totalTests,
      failedTests,
    };
  } catch (error) {
    console.error("\n❌ Error during test execution:", error);

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
console.log("=== ATTEMPTING WITH startVitest METHOD ===");
runCounterTests("start")
  .then((results) => {
    console.log("\n=== TEST SUMMARY (startVitest) ===");
    console.log(`Success: ${results.success ? "Yes ✅" : "No ❌"}`);
    console.log(`Files:   ${results.testFiles || 0}`);
    console.log(`Tests:   ${results.totalTests || 0}`);
    console.log(`Failures: ${results.failedTests || 0}`);

    if (results.error) {
      console.log(`Error: ${results.error}`);
    }

    // Try the second method if the first one failed or had no tests
    if (!results.success || results.totalTests === 0) {
      console.log("\n\n=== RETRYING WITH createVitest METHOD ===");
      return runCounterTests("create").then((createResults) => {
        console.log("\n=== TEST SUMMARY (createVitest) ===");
        console.log(`Success: ${createResults.success ? "Yes ✅" : "No ❌"}`);
        console.log(`Files:   ${createResults.testFiles || 0}`);
        console.log(`Tests:   ${createResults.totalTests || 0}`);
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
    console.log(`\nExiting with code ${exitCode}`);
    process.exit(exitCode);
  })
  .catch((err) => {
    console.error("\n❌ FATAL ERROR:", err);
    process.exit(1);
  });
