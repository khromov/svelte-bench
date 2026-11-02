import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import { getTmpDir } from "./file";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const vitestCLI = path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs");

export interface TestResult {
  testName: string;
  success: boolean;
  testFiles: number;
  totalTests: number;
  failedTests: number;
  errors: string[];
}

interface VitestReport {
  success: boolean;
  numTotalTests: number;
  numFailedTests: number;
  numRuntimeErrorTestSuites: number;
  testResults: {
    status: string;
    message?: string;
    assertionResults: { status: string; failureMessages: string[] }[];
  }[];
}

/** Run each sample in its own process so concurrent Vitest instances cannot
 * share process state, and a timed-out runner cannot poison later samples. */
export async function runTest(testName: string, provider?: string, testDir?: string): Promise<TestResult> {
  let reportDir: string | undefined;
  try {
    const testFilePath = path.resolve(testDir || getTmpDir(provider), `${testName}.test.ts`);
    await fs.access(testFilePath);
    reportDir = await fs.mkdtemp(path.join(tmpdir(), "svelte-bench-vitest-"));
    const reportPath = path.join(reportDir, "result.json");
    console.log(`🧪 Running tests for ${testName}${provider ? ` (${provider})` : ""}...`);

    let executionError: unknown;
    try {
      await execFileAsync(
        process.execPath,
        [
          vitestCLI,
          "run",
          testFilePath,
          // Threads belong to this child process and die with it on timeout.
          // A single sample contains one suite; extra workers provide no benefit.
          "--pool=threads",
          "--maxWorkers=1",
          "--reporter=json",
          `--outputFile=${reportPath}`,
        ],
        { timeout: 120000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024 },
      );
    } catch (error) {
      if ((error as { killed?: boolean }).killed) {
        throw new Error(
          `Test timeout: ${testName} (${provider || "unknown"}) exceeded the maximum execution time of 120 seconds`,
        );
      }
      // Vitest exits nonzero for ordinary assertion and compilation failures.
      // Its report still contains the diagnostics we need for scoring.
      executionError = error;
    }

    let report: VitestReport;
    try {
      report = JSON.parse(await fs.readFile(reportPath, "utf8"));
    } catch {
      throw executionError || new Error("Vitest did not produce a valid test report");
    }
    const errors = report.testResults.flatMap((suite) => [
      ...(suite.message ? [suite.message] : []),
      ...suite.assertionResults.flatMap((test) => test.failureMessages),
    ]);
    if (executionError && errors.length === 0) {
      errors.push(executionError instanceof Error ? executionError.message : String(executionError));
    }
    return {
      testName,
      success:
        !executionError &&
        report.success &&
        report.numTotalTests > 0 &&
        report.testResults.length > 0 &&
        !report.numRuntimeErrorTestSuites &&
        report.testResults.every((suite) => suite.status === "passed"),
      testFiles: report.testResults.length,
      totalTests: report.numTotalTests,
      failedTests: report.numFailedTests,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error running tests for ${testName}:`, message);
    return { testName, success: false, testFiles: 0, totalTests: 0, failedTests: 0, errors: [message] };
  } finally {
    if (reportDir) await fs.rm(reportDir, { recursive: true, force: true });
  }
}
