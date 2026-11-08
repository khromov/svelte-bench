import fs from "node:fs/promises";
import type { Price } from "../src/utils/api-cost";

// Public catalog; no API key or generation requests required.
const response = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`OpenRouter pricing returned HTTP ${response.status}`);
const { data } = (await response.json()) as { data: { id: string; pricing: Record<string, unknown> }[] };
const retrievedAt = new Date().toISOString();
const prices: Price[] = [];
for (const model of data) {
  const p = model.pricing;
  // Flat-rate estimates only. Do not silently ignore context tiers or request charges.
  if (p.overrides || Number(p.request ?? 0) !== 0) continue;
  const number = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined;
  const input = number(p.prompt),
    output = number(p.completion);
  if (input === undefined || output === undefined) continue;
  prices.push({
    provider: "OpenRouter",
    modelId: model.id,
    input,
    output,
    cacheRead: number(p.input_cache_read),
    cacheWrite: number(p.input_cache_write),
    // A current snapshot is never evidence of historical pricing.
    effectiveFrom: retrievedAt,
    sourceUrl: "https://openrouter.ai/api/v1/models",
    retrievedAt,
  });
}
const output = process.argv[2] ?? "pricing/openrouter-current.json";
await fs.mkdir("pricing", { recursive: true });
await fs.writeFile(output, JSON.stringify(prices, null, 2) + "\n");
console.log(
  `Wrote ${prices.length} flat-rate models to ${output}. Review and merge into pricing/api-prices.json; tiered models were omitted.`,
);
