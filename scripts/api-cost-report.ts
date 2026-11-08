import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { estimateCost, type ApiUsage, type Price } from "../src/utils/api-cost";
import type { HumanEvalResult } from "../src/utils/humaneval";

const { values } = parseArgs({
  options: {
    from: { type: "string" },
    to: { type: "string" },
    ledger: { type: "string" },
    pricing: { type: "string", default: "pricing/api-prices.json" },
    output: { type: "string", default: "benchmarks/api-cost-report.json" },
  },
});
const now = new Date();
const twoMonthsAgo = new Date(now);
twoMonthsAgo.setUTCDate(1);
twoMonthsAgo.setUTCMonth(twoMonthsAgo.getUTCMonth() - 2);
const lastDay = new Date(Date.UTC(twoMonthsAgo.getUTCFullYear(), twoMonthsAgo.getUTCMonth() + 1, 0)).getUTCDate();
twoMonthsAgo.setUTCDate(Math.min(now.getUTCDate(), lastDay));
const from = values.from ?? twoMonthsAgo.toISOString().slice(0, 10);
const to = values.to ?? now.toISOString().slice(0, 10);
for (const date of [from, to]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date)
    throw new Error(`Invalid date: ${date}`);
}
if (from > to) throw new Error("from must be before to");
const prices: Price[] = JSON.parse(await fs.readFile(values.pricing!, "utf8"));
const runs = [];
for (const file of (await fs.readdir("benchmarks")).sort()) {
  const match = /^benchmark-results-(\d{4}-\d{2}-\d{2})T.*\.json$/.exec(file);
  if (!match || match[1] < from || match[1] > to) continue;
  const results: HumanEvalResult[] = JSON.parse(await fs.readFile(path.join("benchmarks", file), "utf8"));
  const groups = new Map<string, HumanEvalResult[]>();
  for (const result of results) {
    if (result.provider.toLowerCase() === "ollama") continue;
    const key = JSON.stringify([result.provider, result.modelId]);
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }
  for (const group of groups.values()) {
    const samples = group.flatMap((r) => r.samples);
    const requests: ApiUsage[] = samples.flatMap((s) => s.apiUsage ?? []);
    const missingSamples = samples.filter((s) => !s.apiUsage?.length).length;
    const costs = requests.map((r) => estimateCost(r, prices));
    const missingCosts = costs.filter((c) => c.usd === null).length;
    const sum = (key: "inputTokens" | "outputTokens") =>
      missingSamples || requests.some((r) => r[key] === undefined) ? null : requests.reduce((n, r) => n + r[key]!, 0);
    const knownApiCostUsd = costs.filter((c) => c.source === "api").reduce((n, c) => n + c.usd!, 0);
    const knownEstimatedCostUsd = costs.filter((c) => c.source === "estimate").reduce((n, c) => n + c.usd!, 0);
    runs.push({
      file,
      provider: group[0].provider,
      modelId: group[0].modelId,
      samples: samples.length,
      requests: requests.length,
      missingUsageSamples: missingSamples,
      inputTokens: sum("inputTokens"),
      outputTokens: sum("outputTokens"),
      costUsd: missingSamples || missingCosts ? null : knownApiCostUsd + knownEstimatedCostUsd,
      knownApiCostUsd,
      knownEstimatedCostUsd,
      missingCostRequests: missingCosts,
      status: missingSamples ? "missing-usage" : missingCosts ? "missing-pricing" : "complete",
    });
  }
}
// Ledger totals are separate from result totals: never add both, which would double-count.
const ledgerGroups = new Map<string, ApiUsage[]>();
if (values.ledger) {
  const seen = new Set<string>();
  for (const line of (await fs.readFile(values.ledger, "utf8")).split("\n").filter(Boolean)) {
    const row: ApiUsage = JSON.parse(line);
    if (
      row.provider.toLowerCase() === "ollama" ||
      row.measuredAt.slice(0, 10) < from ||
      row.measuredAt.slice(0, 10) > to
    )
      continue;
    if (row.responseId) {
      const id = JSON.stringify([row.provider, row.modelId, row.responseId]);
      if (seen.has(id)) continue;
      seen.add(id);
    }
    const key = JSON.stringify([row.provider, row.modelId]);
    ledgerGroups.set(key, [...(ledgerGroups.get(key) ?? []), row]);
  }
}
const ledgerTotals = [...ledgerGroups.values()].map((rows) => {
  const costs = rows.map((row) => estimateCost(row, prices));
  const missing = costs.filter((c) => c.usd === null).length;
  const api = costs.filter((c) => c.source === "api").reduce((n, c) => n + c.usd!, 0);
  const estimated = costs.filter((c) => c.source === "estimate").reduce((n, c) => n + c.usd!, 0);
  return {
    provider: rows[0].provider,
    modelId: rows[0].modelId,
    requests: rows.length,
    inputTokens: rows.some((r) => r.inputTokens === undefined) ? null : rows.reduce((n, r) => n + r.inputTokens!, 0),
    outputTokens: rows.some((r) => r.outputTokens === undefined) ? null : rows.reduce((n, r) => n + r.outputTokens!, 0),
    costUsd: missing ? null : api + estimated,
    knownApiCostUsd: api,
    knownEstimatedCostUsd: estimated,
    missingCostRequests: missing,
  };
});
await fs.writeFile(
  values.output!,
  JSON.stringify(
    {
      experimental: true,
      from,
      to,
      scope:
        "Recorded benchmark samples only; inspect benchmarks/api-usage ledgers for rejected completions and interrupted runs. Not an account invoice.",
      runs,
      ...(values.ledger ? { ledger: values.ledger, ledgerTotals } : {}),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Wrote ${runs.length} API runs to ${values.output}; ${runs.filter((r) => r.costUsd === null).length} have unavailable totals.`,
);
