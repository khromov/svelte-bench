import { afterEach, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

it("renders benchmark results and merged/context runs without treating reports as results", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "svelte-bench-static-"));
  dirs.push(dir);
  const benchmarks = path.join(dir, "benchmarks");
  await mkdir(path.join(benchmarks, "v1"), { recursive: true });
  const resultFiles = [
    "benchmark-results-2026-11-08T00-00-00.000Z.json",
    "benchmark-results-2026-11-08T00-00-00.000Z-with-context.json",
    "benchmark-results-merged.json",
  ];
  for (const name of resultFiles) await writeFile(path.join(benchmarks, name), "[]");
  await writeFile(path.join(benchmarks, "v1/v1-benchmark-results-merged.json"), "[]");
  const report = JSON.stringify({ experimental: true, runs: [] });
  await writeFile(path.join(benchmarks, "api-cost-report.json"), report);
  await writeFile(path.join(benchmarks, "other-report.json"), "{}");

  execFileSync(
    process.execPath,
    ["--import", import.meta.resolve("tsx"), fileURLToPath(new URL("../../build-static.ts", import.meta.url))],
    { cwd: dir, stdio: "pipe" },
  );

  const files = await readdir(benchmarks);
  const index = await readFile(path.join(benchmarks, "index.html"), "utf8");
  for (const name of resultFiles) {
    expect(files).toContain(name.replace(".json", ".html"));
    expect(index).toContain(name);
  }
  expect(files).not.toContain("api-cost-report.html");
  expect(files).not.toContain("other-report.html");
  expect(index).not.toContain("api-cost-report");
  expect(index).not.toContain("other-report");
  expect(await readFile(path.join(benchmarks, "api-cost-report.json"), "utf8")).toBe(report);
  expect(await readdir(path.join(benchmarks, "v1"))).toContain("v1-benchmark-results-merged.html");
});
