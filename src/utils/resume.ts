import type { HumanEvalResult } from "./humaneval";
import type { BenchmarkResult, TestDefinition } from "./test-manager";

/**
 * Rebuild the samples recorded for a test from resume data: the test's entry in
 * the completed results plus any in-progress samples saved in the checkpoint.
 * Samples that failed at the API level were never recorded, so they show up as
 * gaps that a resumed run can retry.
 */
export function getRecordedSamples(
  test: TestDefinition,
  completedResults: HumanEvalResult[],
  inProgressSamples: BenchmarkResult[] = []
): BenchmarkResult[] {
  const samplesByIndex = new Map<number, BenchmarkResult>();

  for (const result of completedResults) {
    if (result.testName !== test.name) continue;

    for (const sample of result.samples) {
      samplesByIndex.set(sample.index, {
        testName: test.name,
        llmProvider: result.provider,
        modelIdentifier: result.modelId,
        generatedCode: sample.code,
        // Completed results only keep success and errors; the counts aren't used for pass@k
        testResult: {
          testName: test.name,
          success: sample.success,
          testFiles: 0,
          totalTests: 0,
          failedTests: 0,
          errors: sample.errors,
        },
        promptPath: test.promptPath,
        contextContent: result.context?.content,
        timestamp: new Date().toISOString(),
        sampleIndex: sample.index,
        temperature: sample.temperature,
      });
    }
  }

  for (const sample of inProgressSamples) {
    if (sample.testName === test.name && sample.generatedCode.trim() !== "") {
      samplesByIndex.set(sample.sampleIndex ?? 0, sample);
    }
  }

  return [...samplesByIndex.values()].sort(
    (a, b) => (a.sampleIndex ?? 0) - (b.sampleIndex ?? 0)
  );
}

/**
 * Sample indices that have no recorded sample yet
 */
export function getMissingSampleIndices(
  samples: BenchmarkResult[],
  numSamples: number
): number[] {
  const recorded = new Set(samples.map((sample) => sample.sampleIndex ?? 0));
  return Array.from({ length: numSamples }, (_, i) => i).filter(
    (i) => !recorded.has(i)
  );
}

/**
 * Replace a test's entry in the results, keeping results in test order
 */
export function replaceTestResult(
  results: HumanEvalResult[],
  result: HumanEvalResult,
  tests: TestDefinition[]
): HumanEvalResult[] {
  const updated = results.filter((r) => r.testName !== result.testName);
  updated.push(result);

  const testOrder = new Map(tests.map((test, index) => [test.name, index]));
  return updated.sort(
    (a, b) =>
      (testOrder.get(a.testName) ?? tests.length) -
      (testOrder.get(b.testName) ?? tests.length)
  );
}

/**
 * Count samples still missing across all tests
 */
export function countMissingSamples(
  tests: TestDefinition[],
  results: HumanEvalResult[],
  numSamples: number,
  inProgressSamples: BenchmarkResult[] = []
): number {
  return tests.reduce(
    (total, test) =>
      total +
      getMissingSampleIndices(
        getRecordedSamples(test, results, inProgressSamples),
        numSamples
      ).length,
    0
  );
}
