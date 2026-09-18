// Load environment variables from .env file
import "dotenv/config";

import fs from "fs/promises";
import path from "path";
import { DEFAULT_SYSTEM_PROMPT } from "./src/utils/prompt";
import { loadTestDefinitions, type TestDefinition } from "./src/utils/test-manager";
import { createOllamaClient, getOllamaHost } from "./src/llms/ollama";
import type { HumanEvalResult, TokenTimeSample } from "./src/utils/humaneval";
import {
  ensureModelInstalled,
  isOllamaResult,
  listInstalledModels,
  loadBenchmarkFiles,
  normalizeModelName,
  round,
  unloadModel,
  warmUpModel,
} from "./src/utils/ollama-results";
import {
  TOKEN_TIMES_DIR_NAME,
  getTokenTimesFilePath,
  readTokenTimesFile,
  summarizeSamples,
  writeTokenTimesFile,
  type TokenTimesFile,
} from "./src/utils/token-times";

/**
 * Measure how many output tokens each benchmarked Ollama model produces per response.
 *
 * The benchmark run did not record token counts, and re-running it (10 samples x 9 tests
 * per model) would take days. Instead this script sends ONE sample per test to each model
 * (9 requests per model) at the model's default temperature and stores the token counts and
 * timings Ollama reports in benchmarks/token-times-ollama/<model>.json.
 *
 * `pnpm merge` (part of `pnpm build`) joins those files with the benchmark results: the
 * average output token count divided by the model's measured `tps` estimates how long a
 * typical response took, which the report shows next to the speed figure.
 *
 * Progress is saved after every sample, so an interrupted run resumes where it stopped.
 * Models whose file already covers every test are skipped, so the script is safe to re-run
 * after each batch of benchmarks.
 *
 * Usage:
 *   pnpm ollama-token-times                          # every Ollama model in the benchmark results
 *   pnpm ollama-token-times -- --model gpt-oss:20b   # only the given model(s); repeat the flag for more
 *   pnpm ollama-token-times -- --dry-run             # only list what would be measured
 *   pnpm ollama-token-times -- --force               # discard existing samples and measure again
 *
 * Environment:
 *   OLLAMA_HOST                Ollama server (defaults to http://127.0.0.1:11434)
 *   OLLAMA_TOKEN_TIMES_PULL    Set to "true" to pull models missing from the Ollama host
 */

interface CliOptions {
  dryRun: boolean;
  force: boolean;
  /** Restrict the run to these model ids (empty = every benchmarked Ollama model) */
  models: string[];
}

interface ModelWork {
  provider: string;
  modelId: string;
  /** Tokens per second from the benchmark results, used to estimate response time in the summary */
  tps?: number;
  /** Samples already on disk from an earlier run */
  existing: TokenTimeSample[];
  /** Tests that still need a sample */
  pendingTests: TestDefinition[];
}

function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2);
  const models: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" || args[i] === "-m") {
      const value = args[++i];
      if (!value) throw new Error("--model needs a model id");
      models.push(
        ...value
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
      );
    } else if (args[i].startsWith("--model=")) {
      models.push(
        ...args[i]
          .slice("--model=".length)
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
      );
    }
  }

  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    models,
  };
}

/**
 * Every Ollama provider/model combination that has benchmark results, with its tps if measured
 */
async function findBenchmarkedModels(): Promise<Map<string, { provider: string; modelId: string; tps?: number }>> {
  const models = new Map<string, { provider: string; modelId: string; tps?: number }>();

  for (const file of await loadBenchmarkFiles()) {
    for (const result of file.results.filter(isOllamaResult)) {
      const known = models.get(result.modelId);
      const tps = typeof result.tps === "number" && result.tps > 0 ? result.tps : undefined;
      if (!known) {
        models.set(result.modelId, { provider: result.provider, modelId: result.modelId, tps });
      } else if (known.tps === undefined && tps !== undefined) {
        known.tps = tps;
      }
    }
  }

  return models;
}

/**
 * Work out which models need samples, taking existing files into account
 */
async function collectWork(
  tests: TestDefinition[],
  options: CliOptions,
): Promise<{ work: ModelWork[]; complete: string[] }> {
  const benchmarked = await findBenchmarkedModels();

  // Explicit --model flags may name models that have no results yet; measure them anyway
  const selected =
    options.models.length > 0
      ? options.models.map((modelId) => {
          const match =
            benchmarked.get(modelId) ??
            Array.from(benchmarked.values()).find((m) => normalizeModelName(m.modelId) === normalizeModelName(modelId));
          return match ?? { provider: "Ollama", modelId };
        })
      : Array.from(benchmarked.values());

  const work: ModelWork[] = [];
  const complete: string[] = [];

  for (const model of selected) {
    const existingFile = options.force ? null : await readTokenTimesFile(model.modelId);
    const existing = existingFile?.samples ?? [];
    const covered = new Set(existing.map((s) => s.testName));
    const pendingTests = tests.filter((test) => !covered.has(test.name));

    if (pendingTests.length === 0) {
      complete.push(model.modelId);
      continue;
    }

    work.push({ ...model, existing, pendingTests });
  }

  return { work, complete };
}

/**
 * Send one test prompt at the model's default temperature and record what Ollama reports
 */
async function measureSample(
  client: ReturnType<typeof createOllamaClient>,
  modelId: string,
  test: TestDefinition,
): Promise<TokenTimeSample> {
  const prompt = await fs.readFile(test.promptPath, "utf-8");

  // Same messages as the benchmark run (OllamaProvider.generateCode without context),
  // and no temperature option so the model's default applies, like samples 1-9 did
  const response = await client.chat({
    model: modelId,
    messages: [
      { role: "system", content: DEFAULT_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    stream: false,
  });

  const evalCount = response.eval_count ?? 0;
  const evalDurationNs = response.eval_duration ?? 0;

  if (evalCount <= 0 || evalDurationNs <= 0) {
    throw new Error(
      `Ollama did not report generation counts for "${test.name}" (eval_count=${evalCount}, eval_duration=${evalDurationNs})`,
    );
  }

  return {
    testName: test.name,
    evalCount,
    evalDurationNs,
    promptEvalCount: response.prompt_eval_count ?? 0,
    promptEvalDurationNs: response.prompt_eval_duration ?? 0,
    totalDurationNs: response.total_duration ?? 0,
    measuredAt: new Date().toISOString(),
  };
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

function describeEstimate(file: TokenTimesFile, tps: number | undefined): string {
  const tokens = `${file.avgOutputTokens} tokens/response avg over ${file.sampleCount} sample(s)`;
  if (tps === undefined) return `${tokens}, no tps measured yet (run pnpm ollama-tps)`;
  return `${tokens} -> ~${formatSeconds(file.avgOutputTokens / tps)} per response at ${tps} tok/s`;
}

async function main(): Promise<void> {
  const options = parseCliOptions();
  const host = getOllamaHost();
  const pullMissing = process.env.OLLAMA_TOKEN_TIMES_PULL === "true";

  console.log("🔢 Measuring Ollama output tokens per response (one sample per test)...");
  console.log(`👉 Ollama host: ${host}`);
  console.log(`👉 Output directory: benchmarks/${TOKEN_TIMES_DIR_NAME}/`);

  const tests = await loadTestDefinitions();
  if (tests.length === 0) throw new Error("No tests found in src/tests");
  console.log(`👉 Tests: ${tests.map((t) => t.name).join(", ")}`);

  const { work, complete } = await collectWork(tests, options);

  if (complete.length > 0) {
    console.log(`⏭️ ${complete.length} model(s) already measured: ${complete.join(", ")}`);
  }

  if (work.length === 0) {
    console.log("✅ Nothing to do - every selected model already has a sample for each test.");
    return;
  }

  console.log(`📋 ${work.length} model(s) to measure:`);
  for (const item of work) {
    const resumed = item.existing.length > 0 ? `, resuming with ${item.existing.length} sample(s) on disk` : "";
    console.log(`   - ${item.modelId} (${item.pendingTests.length} sample(s) to go${resumed})`);
  }

  if (options.dryRun) {
    console.log("🏁 Dry run - no requests sent, no files changed.");
    return;
  }

  const client = createOllamaClient(host);
  const installed = await listInstalledModels(client);

  const measured: Array<{ modelId: string; file: TokenTimesFile; tps?: number }> = [];
  const failed: Array<{ modelId: string; reason: string }> = [];

  for (let i = 0; i < work.length; i++) {
    const item = work[i];
    console.log(`\n🤖 [${i + 1}/${work.length}] ${item.modelId}`);

    const samples = [...item.existing];
    let file: TokenTimesFile = { provider: item.provider, modelId: item.modelId, ...summarizeSamples(samples) };

    try {
      await ensureModelInstalled(client, installed, item.modelId, pullMissing, "OLLAMA_TOKEN_TIMES_PULL=true");

      console.log("🔥 Warming up...");
      await warmUpModel(client, item.modelId);

      for (let t = 0; t < item.pendingTests.length; t++) {
        const test = item.pendingTests[t];
        const started = Date.now();
        process.stdout.write(`   [${t + 1}/${item.pendingTests.length}] ${test.name.padEnd(12)} `);

        const sample = await measureSample(client, item.modelId, test);
        samples.push(sample);

        // Save after every sample so an interrupted run can resume
        file = { provider: item.provider, modelId: item.modelId, ...summarizeSamples(samples) };
        await writeTokenTimesFile(file);

        const measuredTps = round(sample.evalCount / (sample.evalDurationNs / 1e9), 1);
        console.log(
          `${String(sample.evalCount).padStart(6)} tokens  (${measuredTps} tok/s, ${formatSeconds((Date.now() - started) / 1000)} wall time)`,
        );
      }

      console.log(`💾 Saved ${path.relative(process.cwd(), getTokenTimesFilePath(item.modelId))}`);
      console.log(`📈 ${describeEstimate(file, item.tps)}`);
      measured.push({ modelId: item.modelId, file, tps: item.tps });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ ${item.modelId}: ${reason}`);
      if (samples.length > item.existing.length) {
        console.error(`   ${samples.length}/${tests.length} sample(s) are saved; re-run to finish the remaining ones.`);
      }
      failed.push({ modelId: item.modelId, reason });
    } finally {
      if (installed.has(normalizeModelName(item.modelId))) {
        await unloadModel(client, item.modelId);
      }
    }
  }

  console.log("\n📊 Summary");
  for (const { modelId, file, tps } of measured) {
    const estimate = tps !== undefined ? formatSeconds(file.avgOutputTokens / tps) : "n/a";
    console.log(`   ${String(file.avgOutputTokens).padStart(8)} tok  ${estimate.padStart(8)}  ${modelId}`);
  }
  for (const { modelId, reason } of failed) {
    console.log(`   ${"failed".padStart(8)}  ${"".padStart(8)}  ${modelId} (${reason})`);
  }

  if (measured.length > 0) {
    console.log("\n👉 Run `pnpm build` to merge the token counts into the report.");
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Error measuring Ollama output tokens:", error);
  process.exit(1);
});
