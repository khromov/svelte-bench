import path from "path";
import fs from "fs/promises";
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { HumanEvalResult } from "./humaneval";
import type { BenchmarkResult, TestDefinition } from "./test-manager";
import { countMissingSamples, getMissingSampleIndices, getRecordedSamples, replaceTestResult } from "./resume";

vi.mock("./file", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./file")>();
  return {
    ...actual,
    loadCheckpoint: vi.fn(),
    saveCheckpoint: vi.fn(),
    removeCheckpoint: vi.fn(),
  };
});

vi.mock("./test-runner", () => ({
  runTest: vi.fn(async (testName: string) => ({
    testName,
    success: true,
    testFiles: 1,
    totalTests: 1,
    failedTests: 0,
    errors: [],
  })),
}));

const PROVIDER = "ResumeTest";
const MODEL = "resume-model";
const NUM_SAMPLES = 3;
const promptPath = path.resolve(process.cwd(), "src/tests/counter/prompt.md");
const testPath = path.resolve(process.cwd(), "src/tests/counter/test.ts");
const tests: TestDefinition[] = ["alpha", "beta", "gamma", "delta"].map((name) => ({ name, promptPath, testPath }));

afterAll(async () => {
  await fs.rm(path.resolve(process.cwd(), "tmp/samples", PROVIDER.toLowerCase()), { recursive: true, force: true });
});

function sample(testName: string, sampleIndex: number, code = "<p>ok</p>"): BenchmarkResult {
  return {
    testName,
    llmProvider: PROVIDER,
    modelIdentifier: MODEL,
    generatedCode: code,
    testResult: { testName, success: true, testFiles: 1, totalTests: 1, failedTests: 0, errors: [] },
    promptPath,
    timestamp: "2026-01-01T00:00:00.000Z",
    sampleIndex,
    temperature: sampleIndex === 0 ? 0 : undefined,
  };
}

function result(testName: string, indices: number[]): HumanEvalResult {
  return {
    testName,
    provider: PROVIDER,
    modelId: MODEL,
    numSamples: indices.length,
    numCorrect: indices.length,
    pass1: 1,
    pass10: 1,
    context: { used: false, content: undefined },
    samples: indices.map((index) => ({
      index,
      code: "<p>ok</p>",
      success: true,
      errors: [],
      temperature: index === 0 ? 0 : undefined,
    })),
  };
}

// alpha is complete, beta dropped sample 1 (index 0), gamma was interrupted
// after two samples, and delta never started
function checkpointWithGaps() {
  return {
    modelId: MODEL,
    provider: PROVIDER,
    completedResults: [result("alpha", [0, 1, 2]), result("beta", [1, 2])],
    currentTestIndex: 2,
    currentSampleIndex: 1,
    currentTestSamples: [sample("gamma", 0), sample("gamma", 1)],
    contextContent: undefined,
    numSamples: NUM_SAMPLES,
    timestamp: "2026-01-01T00:00:00.000Z",
  };
}

describe("resume helpers", () => {
  it("merges completed and in-progress samples by index", () => {
    const samples = getRecordedSamples(
      tests[1],
      [result("alpha", [0, 1, 2]), result("beta", [2])],
      [sample("beta", 0), sample("beta", 1, "  "), sample("gamma", 1)]
    );

    expect(samples.map((s) => s.sampleIndex)).toEqual([0, 2]);
    expect(getMissingSampleIndices(samples, NUM_SAMPLES)).toEqual([1]);
  });

  it("counts gaps, interrupted tests and unstarted tests as missing", () => {
    const checkpoint = checkpointWithGaps();
    expect(
      countMissingSamples(tests, checkpoint.completedResults, NUM_SAMPLES, checkpoint.currentTestSamples)
    ).toBe(1 + 1 + 3);
  });

  it("replaces a test result in place and keeps test order", () => {
    const updated = replaceTestResult(
      [result("gamma", [0]), result("alpha", [0])],
      result("beta", [0, 1]),
      tests
    );
    expect(updated.map((r) => r.testName)).toEqual(["alpha", "beta", "gamma"]);

    const replaced = replaceTestResult(updated, result("beta", [0, 1, 2]), tests);
    expect(replaced.map((r) => r.testName)).toEqual(["alpha", "beta", "gamma"]);
    expect(replaced[1].numSamples).toBe(3);
  });
});

describe.each([
  ["sequential", "./test-manager"],
  ["parallel", "./parallel-test-manager"],
])("%s runner resume", (_mode, modulePath) => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("RETRY_MAX_ATTEMPTS", "1");
  });

  async function setup() {
    const file = await import("./file");
    const manager: typeof import("./test-manager") = await import(modulePath);
    vi.mocked(file.loadCheckpoint).mockReset();
    vi.mocked(file.saveCheckpoint).mockReset();
    vi.mocked(file.removeCheckpoint).mockReset();
    return { file, manager };
  }

  function provider(generateCode: (prompt: string, temperature?: number) => Promise<string>) {
    return {
      name: PROVIDER,
      generateCode: vi.fn(generateCode),
      getModels: () => [MODEL],
      getModelIdentifier: () => MODEL,
    };
  }

  it("runs only the samples missing from the checkpoint", async () => {
    const { file, manager } = await setup();
    vi.mocked(file.loadCheckpoint).mockResolvedValue(checkpointWithGaps());
    const llm = provider(async () => "<p>ok</p>");

    const results = await manager.runAllTestsHumanEval(llm, NUM_SAMPLES, tests);

    // beta index 0 (temperature 0), gamma index 2, delta indices 0-2
    expect(llm.generateCode).toHaveBeenCalledTimes(5);
    expect(llm.generateCode.mock.calls.filter(([, temperature]) => temperature === 0)).toHaveLength(2);
    expect(results.map((r) => r.testName)).toEqual(["alpha", "beta", "gamma", "delta"]);
    for (const r of results) {
      expect(r.samples.map((s) => s.index)).toEqual([0, 1, 2]);
      expect(r.numSamples).toBe(NUM_SAMPLES);
    }
    expect(file.removeCheckpoint).toHaveBeenCalled();
  });

  it("keeps the checkpoint after a dropped sample and retries it on the next run", async () => {
    const { file, manager } = await setup();
    vi.mocked(file.loadCheckpoint).mockResolvedValue(null);
    let calls = 0;
    const flaky = provider(async () => {
      calls++;
      if (calls === 2) throw new Error("Ollama request timed out after 60 minutes");
      return "<p>ok</p>";
    });

    const firstRun = await manager.runAllTestsHumanEval(flaky, NUM_SAMPLES, tests.slice(0, 2));
    expect(firstRun.map((r) => r.numSamples)).toEqual([2, 3]);
    expect(file.removeCheckpoint).not.toHaveBeenCalled();

    // Resume from the last checkpoint the first run saved
    const lastCheckpoint = vi.mocked(file.saveCheckpoint).mock.calls.at(-1)![2];
    vi.mocked(file.loadCheckpoint).mockResolvedValue(JSON.parse(JSON.stringify(lastCheckpoint)));
    const retry = provider(async () => "<p>ok</p>");

    const secondRun = await manager.runAllTestsHumanEval(retry, NUM_SAMPLES, tests.slice(0, 2));
    expect(retry.generateCode).toHaveBeenCalledTimes(1);
    expect(secondRun.map((r) => r.numSamples)).toEqual([3, 3]);
    expect(file.removeCheckpoint).toHaveBeenCalled();
  });
});
