import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { estimateCost, normalizeApiUsage, type Price } from "./api-cost";
const prices: Price[] = JSON.parse(readFileSync("pricing/api-prices.json", "utf8"));

test.each([
  ["OpenAI", "gpt-6.1-sol"],
  ["Anthropic", "claude-sonnet-5-5"],
  ["Google", "gemini-4-argon"],
  ["MiniMax", "MiniMax-M3.1-Flash"],
  ["Z.ai", "glm-5.3"],
  ["Moonshot", "kimi-k3.1-pro"],
  ["Meta", "muse-spark-1.3"],
  ["Fireworks", "accounts/fireworks/models/gpt-oss-120b"],
  ["Thinking Machines Tinker", "thinkingmachines/Inkling-2-Small"],
])("%s calculates a documented native-rate estimate, including cached input", (provider, modelId) => {
  const response =
    provider === "Google"
      ? { usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, cachedContentTokenCount: 10 } }
      : provider === "Anthropic"
        ? { usage: { input_tokens: 90, output_tokens: 20, cache_read_input_tokens: 10 } }
        : { usage: { prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 10 } } };
  const usage = normalizeApiUsage(provider, modelId, response);
  const price = prices.find((p) => p.provider === provider && p.modelId === modelId)!;
  const cost = estimateCost(usage, prices);
  expect(cost.source).toBe("estimate");
  expect(cost.usd).toBeCloseTo(90 * price.input + 10 * price.cacheRead! + 20 * price.output, 12);
});
test.each([
  ["OpenRouter", { usage: { cost: 0.123 } }],
  ["xAI", { usage: { cost_in_usd_ticks: 1230000000 } }],
  ["Cursor", { cost: { chargedCents: 12.3 }, usage: { inputTokens: 100, outputTokens: 20 } }],
])("%s uses API-billed amounts for arbitrary future model IDs", (provider, response) => {
  expect(estimateCost(normalizeApiUsage(provider, "future-model", response), []).usd).toBeCloseTo(0.123);
});
test("unknown rates remain unavailable and all published snapshot rates are valid", () => {
  expect(
    estimateCost(
      normalizeApiUsage("Reflection", "Beam-1.0-501B-A23B", { usage: { prompt_tokens: 100, completion_tokens: 20 } }),
      prices,
    ).usd,
  ).toBeNull();
  for (const price of prices) {
    for (const value of [price.input, price.output, price.cacheRead, price.cacheWrite, price.cacheWrite1h].filter(
      (v) => v !== undefined,
    )) {
      expect(Number.isFinite(value) && value! >= 0, `${price.provider}/${price.modelId}`).toBe(true);
    }
    expect(price.sourceUrl).toMatch(/^https:\/\//);
  }
});
