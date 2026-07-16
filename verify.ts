// Load environment variables from .env file
import "dotenv/config";

import fs from "fs/promises";
import path from "path";
import { loadTestDefinitions } from "./src/utils/test-manager";
import { cleanTmpDir, writeToTmpFile, readFile } from "./src/utils/file";
import { runTest } from "./src/utils/test-runner";
import { ensureRequiredDirectories } from "./src/utils/ensure-dirs";

interface VerificationResult {
  testName: string;
  success: boolean;
  totalTests: number;
  failedTests: number;
  errors: string[];
}

/**
 * Main function to verify reference implementations
 */
async function verifyReferenceImplementations(): Promise<void> {
  console.log("🔍 Verifying reference implementations...");

  try {
    // Ensure required directories exist
    await ensureRequiredDirectories();

    // Clean the tmp directory
    await cleanTmpDir();

    // Load all test definitions
    const tests = await loadTestDefinitions();
    console.log(`📋 Found ${tests.length} tests to verify`);

    // Results array
    const results: VerificationResult[] = [];

    // For each test
    for (const test of tests) {
      console.log(`\n🧪 Verifying reference implementation for: ${test.name}`);

      // Clean the tmp directory before each test
      await cleanTmpDir();

      // Check if the test has a reference implementation
      const referenceFilePath = path.join(path.dirname(test.promptPath), "Reference.svelte");

      try {
        // Check if the reference file exists
        await fs.access(referenceFilePath);

        // Read the reference file
        const referenceContent = await readFile(referenceFilePath);

        // Write the reference implementation to the tmp directory as Component.svelte
        await writeToTmpFile("Component.svelte", referenceContent);

        // Copy the test file to the tmp directory
        const testContent = await readFile(test.testPath);
        await writeToTmpFile(`${test.name}.test.ts`, testContent);

        // Run the test
        const testResult = await runTest(test.name);

        // Store the result
        results.push({
          testName: test.name,
          success: testResult.success,
          totalTests: testResult.totalTests,
          failedTests: testResult.failedTests,
          errors: testResult.errors,
        });

        // Print the result
        console.log(`📊 Reference implementation for ${test.name}:`);
        console.log(`   Success: ${testResult.success ? "Yes ✅" : "No ❌"}`);
        console.log(`   Total Tests: ${testResult.totalTests}`);
        console.log(`   Failed Tests: ${testResult.failedTests}`);

        if (testResult.errors.length > 0) {
          console.log(`   Errors: ${testResult.errors.length}`);
        }
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          console.log(`⚠️ No reference implementation found for ${test.name}`);
        } else {
          console.error(`Error verifying ${test.name}:`, error);
        }
      }
    }

    // Print summary
    console.log("\n📊 Verification Summary:");
    console.log("===========================================");

    const totalTests = results.length;
    const successfulTests = results.filter((r) => r.success).length;

    console.log(`Total Tests with References: ${totalTests}/${tests.length}`);
    console.log(`Passed: ${successfulTests}`);
    console.log(`Failed: ${totalTests - successfulTests}`);

    // Print detailed results
    if (results.length > 0) {
      console.log("\nDetailed Results:");
      console.log("===========================================");

      for (const result of results) {
        console.log(`Test: ${result.testName}`);
        console.log(`  Status: ${result.success ? "✅ PASS" : "❌ FAIL"}`);
        console.log(`  Tests: ${result.totalTests - result.failedTests}/${result.totalTests}`);

        if (result.errors.length > 0) {
          console.log("  Errors:");
          for (const error of result.errors) {
            console.log(`    - ${error}`);
          }
        }

        console.log("-------------------------------------------");
      }
    }

    // Clean up
    await cleanTmpDir();

    // Exit with appropriate code
    const exitCode = successfulTests === totalTests ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error("Error verifying reference implementations:", error);
    process.exit(1);
  }
}

// Run the verification
verifyReferenceImplementations().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
