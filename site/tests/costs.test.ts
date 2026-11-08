import { expect, test } from "vitest";
import { summarizeCost, formatUsd, costSource } from "../src/lib/costs.js";
import type { Result } from "../src/lib/results.js";
import type { ApiUsage } from "../../src/utils/api-cost.js";
const sample = (apiUsage?: ApiUsage[]) => ({ index: 0, code: "", success: true, errors: [], apiUsage });
const result = (samples: Result["samples"], provider = "OpenRouter") => ({ provider, samples });
const request = (usd: number | null, source: "api" | "estimate" | "unavailable" = "api"): ApiUsage => ({
  provider: "OpenRouter",
  modelId: "fixture",
  measuredAt: "2026-11-08T00:00:00.000Z",
  inputTokens: 100,
  outputTokens: 20,
  cost: { usd, source },
});

test("historical missing usage and local models never become free API requests", () => {
  expect(summarizeCost([result([sample()])])).toMatchObject({ status: "missing", inputTokens: null });
  expect(summarizeCost([result([sample()], "Ollama")]).status).toBe("local");
  expect(summarizeCost([result([sample([request(null, "unavailable")])])]).status).toBe("unavailable");
});
test("distinguishes actual zero from missing cost and preserves small charges", () => {
  expect(summarizeCost([result([sample([request(0)])])])).toMatchObject({
    status: "complete",
    knownUsd: 0,
    apiRequests: 1,
  });
  expect(formatUsd(0)).toBe("$0.00");
  expect(formatUsd(0.000001)).toBe("<$0.0001");
  expect(formatUsd(0.0012)).toBe("$0.0012");
});
test("totals all returned retry attempts and labels estimates separately", () => {
  const cost = summarizeCost([result([sample([request(0.1), request(0.2, "estimate")])])]);
  expect(cost).toMatchObject({
    status: "complete",
    requests: 2,
    inputTokens: 200,
    outputTokens: 40,
    apiUsd: 0.1,
    estimatedUsd: 0.2,
  });
  expect(cost.knownUsd).toBeCloseTo(0.3);
  expect(costSource(cost)).toBe("API + estimate");
});
test("mixed coverage shows a partial amount rather than a complete total", () => {
  expect(summarizeCost([result([sample([request(0.2)]), sample()])])).toMatchObject({
    status: "partial",
    knownUsd: 0.2,
    inputTokens: null,
  });
  expect(summarizeCost([result([sample([request(0.2), request(null, "unavailable")])])]).status).toBe("partial");
});
