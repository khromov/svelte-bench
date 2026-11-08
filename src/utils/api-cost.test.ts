import { describe, expect, it, vi } from "vitest";
import {
  captureApiUsage,
  estimateCost,
  normalizeApiUsage,
  recordApiResponse,
  type ApiUsage,
  type Price,
} from "./api-cost";

vi.mock("node:fs", async (original) => ({
  ...(await original<typeof import("node:fs")>()),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));
const rate: Price = {
  provider: "OpenRouter",
  modelId: "test/model",
  input: 2e-6,
  output: 10e-6,
  cacheRead: 0.2e-6,
  cacheWrite: 2.5e-6,
  effectiveFrom: "2026-09-01T00:00:00.000Z",
  sourceUrl: "https://openrouter.ai/api/v1/models",
  retrievedAt: "2026-09-01T00:00:00.000Z",
};
const usage = (u: unknown) => normalizeApiUsage("OpenRouter", "test/model", { id: "gen-123", usage: u });

describe("API cost accounting", () => {
  it("prefers API cost, including actual zero, without requiring token counts", () => {
    for (const cost of [0, 0.123]) expect(estimateCost(usage({ cost }), [])).toEqual({ usd: cost, source: "api" });
    expect(normalizeApiUsage("OpenAI", "test", { usage: { cost: 0.123 } }).cost.usd).toBeNull();
  });
  it("does not turn missing or invalid usage into free requests", () => {
    for (const value of [undefined, null, {}, { prompt_tokens: -1, completion_tokens: NaN }, { prompt_tokens: 0.5 }]) {
      expect(estimateCost(usage(value), [rate]).usd).toBeNull();
    }
  });
  it("prices cache reads and writes without double charging reasoning", () => {
    const row = usage({
      prompt_tokens: 1000,
      completion_tokens: 200,
      prompt_tokens_details: { cached_tokens: 300, cache_write_tokens: 100 },
      completion_tokens_details: { reasoning_tokens: 150 },
    });
    expect(estimateCost(row, [rate]).usd).toBeCloseTo(600 * 2e-6 + 300 * 0.2e-6 + 100 * 2.5e-6 + 200 * 10e-6);
    expect(estimateCost(row, [{ ...rate, cacheWrite: undefined }]).usd).toBeNull();
  });
  it("adds Anthropic caches to its exclusive input count and Google thoughts to visible output", () => {
    const a = normalizeApiUsage("Anthropic", "test", {
      usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 30, cache_creation_input_tokens: 10 },
    });
    expect(a.inputTokens).toBe(140);
    const g = normalizeApiUsage("Google", "test", {
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 40 },
    });
    expect(g.outputTokens).toBe(60);
    expect(g.inputTokens).toBe(100);
  });
  it("requires exact provider, model, effective date and context tier", () => {
    const row = usage({ prompt_tokens: 1000, completion_tokens: 200 });
    row.measuredAt = "2026-10-01T00:00:00.000Z";
    for (const p of [
      { ...rate, provider: "OpenAI" },
      { ...rate, modelId: "other" },
      { ...rate, effectiveFrom: "2026-11-01T00:00:00.000Z" },
      { ...rate, effectiveTo: "2026-10-01T00:00:00.000Z" },
      { ...rate, maxInputTokens: 999 },
    ]) {
      expect(estimateCost(row, [p]).usd).toBeNull();
    }
  });
  it("keeps concurrent samples separate and retains rejected response attempts", async () => {
    const first: ApiUsage[] = [],
      second: ApiUsage[] = [];
    await Promise.all([
      captureApiUsage(first, "counter", 0, async () => {
        recordApiResponse("OpenRouter", "one", { id: "rejected", usage: { cost: 0.1 } });
        await new Promise((resolve) => setTimeout(resolve, 10));
        recordApiResponse("OpenRouter", "one", { id: "accepted", usage: { cost: 0.2 } });
      }),
      captureApiUsage(second, "counter", 1, async () => {
        recordApiResponse("OpenRouter", "two", { id: "parallel", usage: { cost: 0.3 } });
      }),
    ]);
    expect(first.map((r) => r.responseId)).toEqual(["rejected", "accepted"]);
    expect(second.map((r) => r.responseId)).toEqual(["parallel"]);
  });
});
