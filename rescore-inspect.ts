/**
 * Re-score inspect samples that failed only because of the outdated "init"/"update" check.
 *
 * Svelte 5.42 stopped labelling plain $inspect output with "init"/"update", so from the
 * Svelte bump on 2025-11-03 correct components failed src/tests/inspect/test.ts. The fixed
 * test accepts everything the old one did, so passes stay valid and only these failures
 * need to be re-run against their stored code. No LLM calls are made.
 *
 * Usage:
 *   pnpm exec tsx rescore-inspect.ts                    # dry run, shows what would change
 *   pnpm exec tsx rescore-inspect.ts --check-passes 50  # also re-run 50 stored passes (never written)
 *   pnpm exec tsx rescore-inspect.ts --write            # update the benchmark files
 *
 * Afterwards run `pnpm build` to regenerate the merged results and HTML.
 */

import fs from "fs/promises";
import path from "path";
import { runTest, type TestResult } from "./src/utils/test-runner";
import { writeFileAtomic } from "./src/utils/file";
import { calculatePassAtK, type HumanEvalResult } from "./src/utils/humaneval";

const TEST_NAME = "inspect";
const BENCHMARKS_DIR = path.resolve(process.cwd(), "benchmarks");
const TEST_PATH = path.resolve(process.cwd(), "src", "tests", TEST_NAME, "test.ts");
const WORK_DIR = path.resolve(process.cwd(), "tmp", "rescore-inspect");
const REPORT_PATH = path.resolve(process.cwd(), "tmp", "rescore-inspect-report.json");

// Assertion from the old test, e.g. "expected 'Hello world…' to contain 'init'"
const OUTDATED_CHECK_ERROR = /to contain '(init|update)'$/;
// Assertion from the fixed test's expectInspectOutput helper
const INSPECT_CHECK_ERROR = /^Expected \$inspect to log/;

type Sample = HumanEvalResult["samples"][number];

interface BenchmarkFile {
  fileName: string;
  filePath: string;
  raw: string;
  results: HumanEvalResult[];
}

interface SampleRef {
  file: BenchmarkFile;
  result: HumanEvalResult;
  sample: Sample;
}

// "pass"/"fail" are safe to record; "review" means the sample now fails for another reason
// (or didn't run), which points at Svelte drift or flakiness rather than the fixed check
type Outcome = "pass" | "fail" | "review";

function parseArgs() {
  const args = process.argv.slice(2);
  const checkPassesIndex = args.findIndex((arg) => arg.startsWith("--check-passes"));
  let checkPasses = 0;
  if (checkPassesIndex !== -1) {
    const [, inlineValue] = args[checkPassesIndex].split("=");
    checkPasses = Number(inlineValue ?? args[checkPassesIndex + 1] ?? 0);
  }
  return { write: args.includes("--write"), checkPasses };
}

async function loadBenchmarkFiles(): Promise<BenchmarkFile[]> {
  const fileNames = (await fs.readdir(BENCHMARKS_DIR))
    .filter((fileName) => /^benchmark-results-\d{4}-\d{2}-\d{2}T.*\.json$/.test(fileName))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(BENCHMARKS_DIR, fileName);
      const raw = await fs.readFile(filePath, "utf-8");
      return { fileName, filePath, raw, results: JSON.parse(raw) as HumanEvalResult[] };
    }),
  );
}

function serialize(file: BenchmarkFile): string {
  return JSON.stringify(file.results, null, 2) + (file.raw.endsWith("\n") ? "\n" : "");
}

function isOutdatedCheckFailure(sample: Sample): boolean {
  return !sample.success && sample.errors.length > 0 && sample.errors.every((error) => OUTDATED_CHECK_ERROR.test(error));
}

function classify(testResult: TestResult): Outcome {
  if (testResult.totalTests === 0) return "review";
  if (testResult.success) return "pass";
  if (testResult.errors.length > 0 && testResult.errors.every((error) => INSPECT_CHECK_ERROR.test(error))) return "fail";
  return "review";
}

function calculateScores(samples: Sample[]) {
  const numSamples = samples.length;
  const numCorrect = samples.filter((sample) => sample.success).length;
  return {
    numSamples,
    numCorrect,
    pass1: calculatePassAtK(numSamples, numCorrect, 1),
    pass10: calculatePassAtK(numSamples, numCorrect, Math.min(10, numSamples)),
  };
}

// Only rewrite results whose stored scores match the formula used by the test managers
function storedScoresAreConsistent(result: HumanEvalResult): boolean {
  const expected = calculateScores(result.samples);
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  return (
    result.numSamples === expected.numSamples &&
    result.numCorrect === expected.numCorrect &&
    close(result.pass1, expected.pass1) &&
    close(result.pass10, expected.pass10)
  );
}

function pickEvenly<T>(items: T[], count: number): T[] {
  if (count >= items.length) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]);
}

let runCounter = 0;

async function runSample(code: string, testContent: string): Promise<TestResult> {
  const dir = path.join(WORK_DIR, String(runCounter++));
  await fs.mkdir(dir, { recursive: true });

  // Mirror test-manager, which adds runes mode before testing
  const component = code.includes("<svelte:options runes={true} />")
    ? code
    : "<svelte:options runes={true} />\n\n" + code;
  await fs.writeFile(path.join(dir, "Component.svelte"), component);
  await fs.writeFile(path.join(dir, `${TEST_NAME}.test.ts`), testContent);

  try {
    return await runTest(TEST_NAME, undefined, dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function describeSample({ file, result, sample }: SampleRef): string {
  return `${file.fileName} ${result.modelId} sample #${sample.index}`;
}

async function rescoreInspect(): Promise<void> {
  const { write, checkPasses } = parseArgs();
  console.log(`🔁 Re-scoring ${TEST_NAME} samples (${write ? "write" : "dry run"})`);

  const testContent = await fs.readFile(TEST_PATH, "utf-8");
  const files = await loadBenchmarkFiles();

  const candidates: SampleRef[] = [];
  const passes: SampleRef[] = [];
  for (const file of files) {
    for (const result of file.results) {
      if (result.testName !== TEST_NAME) continue;
      for (const sample of result.samples) {
        if (isOutdatedCheckFailure(sample)) candidates.push({ file, result, sample });
        else if (sample.success) passes.push({ file, result, sample });
      }
    }
  }

  const passesToCheck = pickEvenly(passes, checkPasses);
  console.log(
    `📋 ${files.length} files: ${candidates.length} samples failed only the outdated check` +
      (passesToCheck.length > 0 ? `, re-checking ${passesToCheck.length} of ${passes.length} passes` : ""),
  );

  await fs.rm(WORK_DIR, { recursive: true, force: true });

  // Re-run the samples that failed only the outdated check
  const outcomes = new Map<Sample, { outcome: Outcome; testResult: TestResult }>();
  for (const [i, ref] of candidates.entries()) {
    const testResult = await runSample(ref.sample.code, testContent);
    const outcome = classify(testResult);
    outcomes.set(ref.sample, { outcome, testResult });
    console.log(`🔁 [${i + 1}/${candidates.length}] ${describeSample(ref)}: ${outcome}`);
  }

  // Re-run stored passes to confirm the fixed test (and current Svelte) still passes them
  const passRegressions: { sample: string; errors: string[] }[] = [];
  for (const [i, ref] of passesToCheck.entries()) {
    const testResult = await runSample(ref.sample.code, testContent);
    if (!testResult.success) passRegressions.push({ sample: describeSample(ref), errors: testResult.errors });
    console.log(`🔎 [${i + 1}/${passesToCheck.length}] ${describeSample(ref)}: ${testResult.success ? "pass" : "FAIL"}`);
  }

  // Apply outcomes to results in memory
  const changedFiles = new Set<BenchmarkFile>();
  const scoreChanges: Record<string, string | number>[] = [];
  const skippedResults: string[] = [];
  const reviewSamples: { sample: string; errors: string[] }[] = [];

  for (const ref of candidates) {
    const { outcome, testResult } = outcomes.get(ref.sample)!;
    if (outcome === "review") reviewSamples.push({ sample: describeSample(ref), errors: testResult.errors });
  }

  for (const file of files) {
    for (const result of file.results) {
      const applicable = result.samples.filter((sample) => {
        const entry = outcomes.get(sample);
        return entry && entry.outcome !== "review";
      });
      if (applicable.length === 0) continue;

      if (!storedScoresAreConsistent(result)) {
        skippedResults.push(`${file.fileName} ${result.modelId}`);
        continue;
      }

      const before = { numCorrect: result.numCorrect, pass1: result.pass1, pass10: result.pass10 };
      for (const sample of applicable) {
        const { testResult } = outcomes.get(sample)!;
        sample.success = testResult.success;
        sample.errors = testResult.errors;
      }
      Object.assign(result, calculateScores(result.samples));
      changedFiles.add(file);

      scoreChanges.push({
        file: file.fileName,
        model: result.modelId,
        correct: `${before.numCorrect} → ${result.numCorrect} / ${result.numSamples}`,
        pass1: `${before.pass1.toFixed(3)} → ${result.pass1.toFixed(3)}`,
        pass10: `${before.pass10.toFixed(3)} → ${result.pass10.toFixed(3)}`,
      });
    }
  }

  if (write) {
    for (const file of changedFiles) {
      // Guard against reformatting files that don't round-trip through JSON.stringify
      const original = { ...file, results: JSON.parse(file.raw) as HumanEvalResult[] };
      if (serialize(original) !== file.raw) {
        skippedResults.push(`${file.fileName} (formatting would change, not written)`);
        continue;
      }
      await writeFileAtomic(file.filePath, serialize(file));
    }
  }

  await fs.rm(WORK_DIR, { recursive: true, force: true });

  const counts = { pass: 0, fail: 0, review: 0 };
  for (const { outcome } of outcomes.values()) counts[outcome]++;

  console.log("\n📊 Re-score Summary:");
  console.log("===========================================");
  console.log(`Re-run: ${candidates.length} (now pass: ${counts.pass}, still fail: ${counts.fail}, needs review: ${counts.review})`);
  console.log(`Results changed: ${scoreChanges.length} in ${changedFiles.size} files${write ? " (written)" : " (dry run, nothing written)"}`);
  if (scoreChanges.length > 0) console.table(scoreChanges);
  if (passesToCheck.length > 0) {
    console.log(`Pass re-check: ${passesToCheck.length - passRegressions.length}/${passesToCheck.length} still pass`);
  }
  for (const { sample, errors } of passRegressions) console.log(`  ❌ pass now fails: ${sample}\n     ${errors.join("\n     ")}`);
  for (const { sample, errors } of reviewSamples) console.log(`  ⚠️ needs review (not applied): ${sample}\n     ${errors.join("\n     ")}`);
  for (const skipped of skippedResults) console.log(`  ⚠️ skipped: ${skipped}`);

  await fs.writeFile(
    REPORT_PATH,
    JSON.stringify({ write, counts, scoreChanges, passRegressions, reviewSamples, skippedResults }, null, 2),
  );
  console.log(`📝 Report written to ${REPORT_PATH}`);

  const needsAttention = passRegressions.length > 0 || reviewSamples.length > 0 || skippedResults.length > 0;
  process.exit(needsAttention ? 1 : 0);
}

rescoreInspect().catch((error) => {
  console.error("Error re-scoring inspect samples:", error);
  process.exit(1);
});
