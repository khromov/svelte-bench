import "dotenv/config";
import fs from "node:fs/promises";
import type { ApiUsage } from "../src/utils/api-cost";

// Enrich a copy of a usage ledger by exact OpenRouter response ID. No fuzzy timestamp matching.
const [input, output] = process.argv.slice(2);
if (!input || !output || input === output)
  throw new Error("Usage: pnpm cost:reconcile <ledger.jsonl> <new-output.jsonl>");
if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is required");
const rows = (await fs.readFile(input, "utf8"))
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line) as ApiUsage);
const cache = new Map<string, number>();
for (const row of rows) {
  if (row.provider !== "OpenRouter" || !row.responseId || row.cost.source === "api") continue;
  if (!cache.has(row.responseId)) {
    const response = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(row.responseId)}`, {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Generation lookup returned HTTP ${response.status}; original ledger unchanged`);
    const { data } = (await response.json()) as { data: { total_cost?: number } };
    if (typeof data.total_cost !== "number" || !Number.isFinite(data.total_cost) || data.total_cost < 0)
      throw new Error("Generation lookup did not return a valid total_cost");
    cache.set(row.responseId, data.total_cost);
  }
  row.cost = { usd: cache.get(row.responseId)!, source: "api" };
}
await fs.writeFile(output, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", { flag: "wx" });
console.log(`Wrote reconciled ledger to ${output}. Original ledger and benchmark results unchanged.`);
