import "dotenv/config";
import fs from "node:fs/promises";
import type { ApiUsage } from "../src/utils/api-cost";

// Enrich a ledger copy by exact IDs. Cursor agents are fresh per benchmark sample.
const [input, output] = process.argv.slice(2);
if (!input || !output || input === output)
  throw new Error("Usage: pnpm cost:reconcile <ledger.jsonl> <new-output.jsonl>");
const rows = (await fs.readFile(input, "utf8"))
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line) as ApiUsage);
const cache = new Map<string, number>();
for (const row of rows) {
  if (row.cost.source === "api") continue;
  const id = row.provider === "OpenRouter" ? row.responseId : row.provider === "Cursor" ? row.billingId : undefined;
  if (!id) continue;
  const key = `${row.provider}:${id}`;
  if (!cache.has(key)) {
    let usd: number | undefined;
    if (row.provider === "OpenRouter") {
      if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is required for OpenRouter rows");
      const response = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(`Generation lookup returned HTTP ${response.status}; original ledger unchanged`);
      const { data } = (await response.json()) as { data: { total_cost?: number } };
      usd = data.total_cost;
    } else {
      if (!process.env.CURSOR_API_KEY) throw new Error("CURSOR_API_KEY is required for Cursor rows");
      const { Agent } = await import("@cursor/sdk");
      const billed = await Agent.getUsage(id, { apiKey: process.env.CURSOR_API_KEY });
      usd = billed.cost?.chargedCents === undefined ? undefined : billed.cost.chargedCents / 100;
    }
    if (typeof usd !== "number" || !Number.isFinite(usd) || usd < 0)
      throw new Error(`${row.provider} billing did not return a valid charged cost (billing may still be pending)`);
    cache.set(key, usd);
  }
  row.cost = { usd: cache.get(key)!, source: "api" };
}
await fs.writeFile(output, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", { flag: "wx" });
console.log(`Wrote reconciled ledger to ${output}. Original ledger and benchmark results unchanged.`);
