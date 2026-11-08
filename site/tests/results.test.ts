import { expect, test } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { models, visibleModels, formatDuration, type Result } from "../src/lib/results.js";
import { legacyRanking, legacyV1Ranking } from "./fixtures/legacy-ranking.js";
const benchmarks = path.resolve("../benchmarks");
test("matches archived EJS scores, ordering, speed and response metadata across every current result", async () => {
  const files = (await readdir(benchmarks)).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const results: Result[] = JSON.parse(await readFile(path.join(benchmarks, file), "utf8"));
    const providers = [...new Set(results.map((r) => r.provider))].sort((a, b) => a.localeCompare(b));
    const groups = providers.map((provider) => ({
      provider,
      models: Object.fromEntries(
        [...new Set(results.filter((r) => r.provider === provider).map((r) => r.modelId))]
          .sort((a, b) => a.localeCompare(b))
          .map((model) => [model, results.filter((r) => r.provider === provider && r.modelId === model)]),
      ),
    }));
    const old = legacyRanking(groups);
    const current = models(results);
    expect(
      current.map((m) => ({
        provider: m.provider,
        model: m.model,
        score: m.score,
        tps: m.tps,
        tokenTimes: m.tokenTimes,
      })),
      file,
    ).toEqual(
      old.map((m: { provider: string; model: string; score: number; tps: number | null; tokenTimes: unknown }) => ({
        provider: m.provider,
        model: m.model,
        score: m.score,
        tps: m.tps,
        tokenTimes: m.tokenTimes,
      })),
    );
  }
});
test("v1 score ordering matches its original stable score-only comparator", async () => {
  for (const name of (await readdir(path.join(benchmarks, "v1"))).filter((n) => n.endsWith(".json"))) {
    const results: Result[] = JSON.parse(await readFile(path.join(benchmarks, "v1", name), "utf8"));
    const current = models(results, true);
    const providers = [...new Set(results.map((r) => r.provider))].sort((a, b) => a.localeCompare(b));
    const groups = providers.map((provider) => ({
      provider,
      models: Object.fromEntries(
        [...new Set(results.filter((r) => r.provider === provider).map((r) => r.modelId))]
          .sort((a, b) => a.localeCompare(b))
          .map((model) => [model, results.filter((r) => r.provider === provider && r.modelId === model)]),
      ),
    }));
    const expected = legacyV1Ranking(groups);
    expect(
      current.map((m) => ({ provider: m.provider, model: m.model, score: m.score })),
      name,
    ).toEqual(
      expected.map((m: { provider: string; model: string; score: number }) => ({
        provider: m.provider,
        model: m.model,
        score: m.score,
      })),
    );
  }
});
const fixture = (modelId: string, tps?: number, seconds?: number): Result => ({
  provider: "ollama",
  modelId,
  testName: "counter",
  numSamples: 1,
  numCorrect: 1,
  pass1: 1,
  pass10: 1,
  samples: [],
  tps,
  ...(seconds === undefined
    ? {}
    : {
        tokenTimes: {
          sampleCount: 1,
          avgOutputTokens: 20,
          avgPromptTokens: 10,
          avgEvalDurationNs: 1,
          avgResponseSeconds: seconds,
          measuredAt: "",
          samples: [],
        },
      }),
});
test("ties favor faster local models; missing metrics sort last in either direction; all tabs support sorting", () => {
  const all = models([fixture("slow", 10, 4), fixture("fast", 20, 2), fixture("unknown")]);
  expect(all.map((m) => m.model)).toEqual(["fast", "slow", "unknown"]);
  expect(visibleModels(all, "", "local", "tps-asc").map((m) => m.model)).toEqual(["slow", "fast", "unknown"]);
  expect(visibleModels(all, "", "local", "time").map((m) => m.model)).toEqual(["fast", "slow", "unknown"]);
  expect(visibleModels(all, "", "all", "time-desc").map((m) => m.model)).toEqual(["slow", "fast", "unknown"]);
  expect(visibleModels(all, "OLLAMA FAST", "local", "score").map((m) => m.model)).toEqual(["fast"]);
  expect(formatDuration(192)).toBe("3m 12s");
});

test("all leaderboard columns toggle ascending/descending with missing metrics last", () => {
  const all = models([fixture("alpha", 10, 4), { ...fixture("beta", 20, 2), pass1: 0.5 }, fixture("unknown")]);
  expect(visibleModels(all, "", "all", "model").map((m) => m.model)).toEqual(["alpha", "beta", "unknown"]);
  expect(visibleModels(all, "", "all", "model-desc").map((m) => m.model)).toEqual(["unknown", "beta", "alpha"]);
  expect(visibleModels(all, "", "all", "score-asc")[0].model).toBe("beta");
  expect(visibleModels(all, "", "all", "rank-desc")[0].rank).toBe(3);
});
