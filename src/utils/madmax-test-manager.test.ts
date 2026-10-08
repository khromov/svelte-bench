import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "../llms";
import type { HumanEvalResult } from "./humaneval";
import { loadTestCheckpoint, removeTestCheckpoint, saveTestCheckpoint } from "./file";
import { runHumanEvalTest } from "./parallel-test-manager";
import { runAllTestsHumanEvalMadmax } from "./madmax-test-manager";

vi.mock("./file", () => ({
  loadTestCheckpoint: vi.fn(),
  removeTestCheckpoint: vi.fn(),
  saveTestCheckpoint: vi.fn(),
}));
vi.mock("./parallel-test-manager", () => ({
  loadTestDefinitions: vi.fn(),
  runHumanEvalTest: vi.fn(),
}));

const provider = { name: "Test", getModelIdentifier: () => "model" } as LLMProvider;
const test = { name: "counter", promptPath: "prompt.md", testPath: "test.ts" };
function result(indices: number[]): HumanEvalResult {
  return {
    testName: test.name,
    provider: provider.name,
    modelId: "model",
    numSamples: indices.length,
    numCorrect: indices.length,
    pass1: 1,
    pass10: 1,
    samples: indices.map((index) => ({ index, code: "<p>ok</p>", success: true, errors: [] })),
  };
}
function checkpoint(indices: number[], completed = true) {
  return {
    mode: "madmax",
    provider: provider.name,
    modelId: "model",
    testName: test.name,
    numSamples: 3,
    completed,
    result: result(indices),
  };
}

beforeEach(() => vi.resetAllMocks());

describe("MadMax resume", () => {
  it("retries API gaps even in old checkpoints marked complete", async () => {
    vi.mocked(loadTestCheckpoint).mockResolvedValue(checkpoint([0, 2]));
    vi.mocked(runHumanEvalTest).mockResolvedValue(result([0, 1, 2]));
    await runAllTestsHumanEvalMadmax(provider, 3, [test]);
    const args = vi.mocked(runHumanEvalTest).mock.calls[0];
    expect(args[6]?.map((sample) => sample.sampleIndex)).toEqual([0, 2]);
    expect(args[7]).toEqual([1]);
    expect(removeTestCheckpoint).toHaveBeenCalledOnce();
  });

  it.each([[], [0, 2]])("keeps incomplete checkpoints for recorded indices %j", async (...indices) => {
    vi.mocked(loadTestCheckpoint).mockResolvedValue(null);
    vi.mocked(runHumanEvalTest).mockResolvedValue(result(indices as number[]));
    await runAllTestsHumanEvalMadmax(provider, 3, [test]);
    expect(saveTestCheckpoint).toHaveBeenCalledWith(
      "Test",
      "model",
      "counter",
      expect.objectContaining({ completed: false }),
    );
    expect(removeTestCheckpoint).not.toHaveBeenCalled();
  });

  it("reuses a fully recorded category without generating again", async () => {
    vi.mocked(loadTestCheckpoint).mockResolvedValue(checkpoint([0, 1, 2]));
    expect(await runAllTestsHumanEvalMadmax(provider, 3, [test])).toEqual([result([0, 1, 2])]);
    expect(runHumanEvalTest).not.toHaveBeenCalled();
  });

  it("does not reuse samples from a different context", async () => {
    vi.mocked(loadTestCheckpoint).mockResolvedValue(checkpoint([0, 1, 2]));
    vi.mocked(runHumanEvalTest).mockResolvedValue(result([0, 1]));
    await runAllTestsHumanEvalMadmax(provider, 3, [test], "new docs");
    expect(vi.mocked(runHumanEvalTest).mock.calls[0][6]).toEqual([]);
    expect(removeTestCheckpoint).not.toHaveBeenCalled();
  });
});
