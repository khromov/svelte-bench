import type { LLMProvider } from "../llms";
import type { HumanEvalResult } from "./humaneval";
import { loadTestCheckpoint, removeTestCheckpoint, saveTestCheckpoint } from "./file";
import { emitSampleProgress, emitTestComplete, emitTestStart, isTUIMode, log } from "./tui-events";
import { loadTestDefinitions, runHumanEvalTest, type TestDefinition } from "./parallel-test-manager";

interface MadmaxCheckpoint {
  mode: "madmax";
  provider: string;
  modelId: string;
  testName: string;
  numSamples: number;
  contextContent?: string;
  completed: boolean;
  result: HumanEvalResult;
  timestamp: string;
}

function checkpointMatches(
  checkpoint: MadmaxCheckpoint | null,
  provider: string,
  modelId: string,
  test: TestDefinition,
  numSamples: number,
  contextContent?: string,
): checkpoint is MadmaxCheckpoint {
  return Boolean(
    checkpoint?.mode === "madmax" &&
    checkpoint.completed &&
    checkpoint.provider === provider &&
    checkpoint.modelId === modelId &&
    checkpoint.testName === test.name &&
    checkpoint.numSamples === numSamples &&
    checkpoint.contextContent === contextContent,
  );
}

function emitCachedResult(result: HumanEvalResult, numSamples: number): void {
  if (!isTUIMode()) return;
  emitTestStart(result.testName, 1, numSamples);
  emitSampleProgress(result.testName, numSamples, numSamples);
  emitTestComplete(result.testName, numSamples, numSamples, result.numCorrect > 0, result.pass1, result.pass10);
}

/**
 * Run every category concurrently, while retaining sample-level parallelism
 * inside each category. Each category owns its checkpoint file, and results
 * are sorted back into test-definition order before being returned.
 */
export async function runAllTestsHumanEvalMadmax(
  llmProvider: LLMProvider,
  numSamples = 10,
  specificTests?: TestDefinition[],
  contextContent?: string,
): Promise<HumanEvalResult[]> {
  const provider = llmProvider.name;
  const modelId = llmProvider.getModelIdentifier();
  const tests = (specificTests?.length ? specificTests : await loadTestDefinitions())
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  log(`\nRunning MADMAX: ${tests.length} test categories concurrently with ${numSamples} samples each`);

  const results = await Promise.all(
    tests.map(async (test) => {
      const checkpoint = await loadTestCheckpoint(provider, modelId, test.name);
      if (checkpointMatches(checkpoint, provider, modelId, test, numSamples, contextContent)) {
        log(`Resuming MADMAX category ${test.name} from its completed checkpoint`);
        emitCachedResult(checkpoint.result, numSamples);
        return checkpoint.result;
      }

      const result = await runHumanEvalTest(
        test,
        llmProvider,
        numSamples,
        contextContent,
        undefined,
        undefined,
        [],
        0,
        { retryRateLimits: true },
      );

      // runHumanEvalTest emits completion for successful samples itself. A
      // category with zero valid samples still needs a terminal event so the
      // TUI cannot remain stuck in the running state.
      if (isTUIMode() && result.numSamples === 0) {
        emitTestComplete(test.name, numSamples, numSamples, false, 0, 0);
      }

      const checkpointData: MadmaxCheckpoint = {
        mode: "madmax",
        provider,
        modelId,
        testName: test.name,
        numSamples,
        contextContent,
        completed: true,
        result,
        timestamp: new Date().toISOString(),
      };
      await saveTestCheckpoint(provider, modelId, test.name, checkpointData);
      return result;
    }),
  );

  const orderedResults = results.sort(
    (a, b) => tests.findIndex((test) => test.name === a.testName) - tests.findIndex((test) => test.name === b.testName),
  );

  if (orderedResults.length === tests.length && orderedResults.every((result) => result.numSamples > 0)) {
    await Promise.all(tests.map((test) => removeTestCheckpoint(provider, modelId, test.name)));
  }

  return orderedResults;
}
