import { afterEach, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
});
it("reports the requested API window, unknown historical usage and reconciled ledgers separately", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "svelte-bench-cost-report-"));
  dirs.push(dir);
  await mkdir(path.join(dir, "benchmarks"));
  await mkdir(path.join(dir, "pricing"));
  await writeFile(path.join(dir, "pricing/api-prices.json"), "[]");
  const row = { provider: "OpenRouter", modelId: "model", samples: [{ index: 0 }] };
  await writeFile(path.join(dir, "benchmarks/benchmark-results-2026-09-07T00-00-00.000Z.json"), JSON.stringify([row]));
  await writeFile(
    path.join(dir, "benchmarks/benchmark-results-2026-09-08T00-00-00.000Z.json"),
    JSON.stringify([row, { ...row, provider: "Ollama" }]),
  );
  const request = {
    provider: "OpenRouter",
    modelId: "model",
    measuredAt: "2026-09-08T00:00:00.000Z",
    responseId: "id",
    cost: { source: "api", usd: 0.25 },
  };
  await writeFile(path.join(dir, "ledger.jsonl"), [request, request].map((r) => JSON.stringify(r)).join("\n"));
  execFileSync(
    process.execPath,
    [
      "--import",
      import.meta.resolve("tsx"),
      fileURLToPath(new URL("../../scripts/api-cost-report.ts", import.meta.url)),
      "--from",
      "2026-09-08",
      "--to",
      "2026-11-08",
      "--ledger",
      "ledger.jsonl",
    ],
    { cwd: dir },
  );
  const report = JSON.parse(await readFile(path.join(dir, "benchmarks/api-cost-report.json"), "utf8"));
  expect(report.runs).toHaveLength(1);
  expect(report.runs[0]).toMatchObject({
    costUsd: null,
    inputTokens: null,
    outputTokens: null,
    missingUsageSamples: 1,
  });
  expect(report.ledgerTotals[0]).toMatchObject({ requests: 1, costUsd: 0.25, knownApiCostUsd: 0.25 });
});
