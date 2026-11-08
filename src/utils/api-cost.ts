import { AsyncLocalStorage } from "node:async_hooks";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface ApiUsage {
  provider: string;
  modelId: string;
  responseId?: string;
  billingId?: string;
  measuredAt: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  cacheWrite5mTokens?: number;
  cacheWrite1hTokens?: number;
  reasoningTokens?: number;
  rawUsage?: unknown;
  cost: { usd: number | null; source: "api" | "estimate" | "unavailable"; reason?: string; pricing?: Price };
}

/** USD per token. Entries are exact provider/model matches, valid in [effectiveFrom, effectiveTo). */
export interface Price {
  provider: string;
  modelId: string;
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
  cacheWrite1h?: number;
  maxInputTokens?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  sourceUrl: string;
  retrievedAt: string;
}

const storage = new AsyncLocalStorage<{ requests: ApiUsage[]; testName: string; sampleIndex: number }>();
const ledgerName = `api-usage-${new Date().toISOString().replaceAll(":", "-")}-${process.pid}.jsonl`;
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
const count = (n: unknown): number | undefined => (finite(n) && Number.isSafeInteger(n) ? n : undefined);

export function captureApiUsage<T>(
  requests: ApiUsage[],
  testName: string,
  sampleIndex: number,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run({ requests, testName, sampleIndex }, fn);
}

export function normalizeApiUsage(provider: string, modelId: string, response: any): ApiUsage {
  const raw = response?.usage ?? response?.usageMetadata;
  const u = raw ?? {};
  let input = count(u.input_tokens ?? u.prompt_tokens);
  let output = count(u.output_tokens ?? u.completion_tokens);
  let cached = count(u.input_tokens_details?.cached_tokens ?? u.prompt_tokens_details?.cached_tokens);
  let write = count(u.input_tokens_details?.cache_write_tokens ?? u.prompt_tokens_details?.cache_write_tokens);
  let reasoning = count(u.output_tokens_details?.reasoning_tokens ?? u.completion_tokens_details?.reasoning_tokens);
  if (provider === "Anthropic") {
    cached = count(u.cache_read_input_tokens);
    write = count(u.cache_creation_input_tokens);
    if (input !== undefined) input += (cached ?? 0) + (write ?? 0);
  }
  if (provider === "Google") {
    input = count(u.promptTokenCount);
    const candidates = count(u.candidatesTokenCount);
    reasoning = count(u.thoughtsTokenCount);
    output = candidates === undefined ? undefined : candidates + (reasoning ?? 0);
    cached = count(u.cachedContentTokenCount);
  }
  let apiCost = provider === "OpenRouter" && finite(u.cost) ? u.cost : undefined;
  if (provider === "xAI" && count(u.cost_in_usd_ticks) !== undefined) apiCost = u.cost_in_usd_ticks / 1e10;
  if (provider === "Cursor") {
    input = count(u.inputTokens);
    output = count(u.outputTokens);
    cached = count(u.cacheReadTokens);
    write = count(u.cacheWriteTokens);
    reasoning = count(u.reasoningTokens);
    // Preserve the SDK total input count; cache fields are its breakdown.
    if (finite(response?.cost?.chargedCents)) apiCost = response.cost.chargedCents / 100;
  }
  const cacheWrite5mTokens = count(u.cache_creation?.ephemeral_5m_input_tokens);
  const cacheWrite1hTokens = count(u.cache_creation?.ephemeral_1h_input_tokens);
  return {
    provider,
    modelId,
    responseId: response?.id ?? response?.responseId,
    billingId: provider === "Cursor" ? response?.agentId : undefined,
    measuredAt: new Date().toISOString(),
    inputTokens: input,
    outputTokens: output,
    cachedInputTokens: cached,
    cacheWriteTokens: write,
    cacheWrite5mTokens,
    cacheWrite1hTokens,
    reasoningTokens: reasoning,
    rawUsage: provider === "Cursor" ? { usage: raw, cost: response?.cost } : raw,
    cost:
      apiCost === undefined
        ? { usd: null, source: "unavailable", reason: "No API-reported USD cost or applicable documented rate" }
        : { usd: apiCost, source: "api" },
  };
}

export function estimateCost(usage: ApiUsage, prices: Price[]): ApiUsage["cost"] {
  if (usage.cost.source === "api") return usage.cost;
  const {
    inputTokens: input,
    outputTokens: output,
    cachedInputTokens: cached = 0,
    cacheWriteTokens: write = 0,
  } = usage;
  if (input === undefined || output === undefined)
    return { usd: null, source: "unavailable", reason: "API token usage was not saved" };
  const rate = prices.find(
    (p) =>
      p.provider === usage.provider &&
      p.modelId === usage.modelId &&
      p.effectiveFrom <= usage.measuredAt &&
      (!p.effectiveTo || usage.measuredAt < p.effectiveTo),
  );
  if (!rate) return usage.cost;
  if (rate.maxInputTokens !== undefined && input > rate.maxInputTokens)
    return { usd: null, source: "unavailable", reason: "Input exceeds documented pricing tier" };
  const write1h = usage.cacheWrite1hTokens ?? 0;
  const write5m = usage.cacheWrite5mTokens ?? write - write1h;
  if (
    write5m + write1h !== write ||
    write5m < 0 ||
    write1h < 0 ||
    cached + write > input ||
    ![rate.input, rate.output].every(finite) ||
    (cached > 0 && !finite(rate.cacheRead)) ||
    (write5m > 0 && !finite(rate.cacheWrite)) ||
    (write1h > 0 && !finite(rate.cacheWrite1h))
  ) {
    return { usd: null, source: "unavailable", reason: "Incomplete cache pricing or inconsistent token counts" };
  }
  // Reasoning is already included in outputTokens. Do not charge it twice.
  return {
    usd:
      (input - cached - write) * rate.input +
      output * rate.output +
      cached * (rate.cacheRead ?? 0) +
      write5m * (rate.cacheWrite ?? 0) +
      write1h * (rate.cacheWrite1h ?? 0),
    source: "estimate",
    pricing: rate,
  };
}

let prices: Price[] | undefined;
export function recordApiResponse(provider: string, modelId: string, response: unknown): void {
  const scope = storage.getStore();
  if (!scope) return; // Model validation is not a benchmark sample.
  const usage = normalizeApiUsage(provider, modelId, response);
  try {
    prices ??= process.env.COST_PRICING_FILE
      ? JSON.parse(readFileSync(process.env.COST_PRICING_FILE, "utf8"))
      : JSON.parse(readFileSync("pricing/api-prices.json", "utf8"));
    usage.cost = estimateCost(usage, prices!);
  } catch {
    console.warn("Could not read COST_PRICING_FILE; keeping API usage without an estimate");
  }
  scope.requests.push(usage);
  // Persist before cleaning/testing/retries: rejected completions still incur cost.
  try {
    const dir = path.resolve("benchmarks", "api-usage");
    mkdirSync(dir, { recursive: true });
    appendFileSync(
      path.join(dir, ledgerName),
      JSON.stringify({ testName: scope.testName, sampleIndex: scope.sampleIndex, ...usage }) + "\n",
    );
  } catch {
    console.warn("Could not persist API usage ledger; usage remains in sample results");
  }
}
