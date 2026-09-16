// Load environment variables from .env file
import "dotenv/config";

import fs from "fs/promises";
import path from "path";
import { DEFAULT_SYSTEM_PROMPT } from "./src/utils/prompt";
import { loadTestDefinitions } from "./src/utils/test-manager";
import { createOllamaClient, getOllamaHost } from "./src/llms/ollama";
import type { HumanEvalResult, TpsDetails } from "./src/utils/humaneval";

/**
 * Measure generation speed (tokens per second) for every Ollama model that has
 * benchmark results, and write it back into those benchmark JSON files.
 *
 * For each model, ONE test prompt is sent through Ollama and the speed is taken
 * from the token counts and durations Ollama reports in its response, so the
 * figure reflects the server's own decode timing rather than network latency.
 *
 * Models whose results already carry a `tps` value are skipped, so re-running
 * this script only does work for newly benchmarked models.
 *
 * Usage:
 *   pnpm ollama-tps                 # measure every Ollama model that lacks a tps value
 *   pnpm ollama-tps -- --dry-run    # only list what would be measured
 *   pnpm ollama-tps -- --force      # re-measure models that already have a tps value
 *
 * Environment:
 *   OLLAMA_HOST       Ollama server (defaults to http://127.0.0.1:11434)
 *   OLLAMA_TPS_TEST   Which test prompt to send (defaults to "counter")
 *   OLLAMA_TPS_PULL   Set to "true" to pull models missing from the Ollama host
 */

const DEFAULT_TEST_NAME = "counter";
const OLLAMA_PROVIDER_NAME = "ollama";

interface BenchmarkFile {
  filePath: string;
  results: HumanEvalResult[];
  /** Whether the original file ended with a newline, so we write it back the same way */
  trailingNewline: boolean;
}

interface ModelWork {
  modelId: string;
  /** Files that contain results for this model and are missing a tps value */
  files: BenchmarkFile[];
}

interface Measurement {
  tps: number;
  details: TpsDetails;
}

interface CliOptions {
  dryRun: boolean;
  force: boolean;
}

function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
  };
}

function isOllamaResult(result: HumanEvalResult): boolean {
  return typeof result.provider === "string" && result.provider.toLowerCase() === OLLAMA_PROVIDER_NAME;
}

function hasTps(result: HumanEvalResult): boolean {
  return typeof result.tps === "number" && Number.isFinite(result.tps) && result.tps > 0;
}

/**
 * Load every timestamped benchmark JSON file (the merged file is derived, so it is skipped)
 */
async function loadBenchmarkFiles(): Promise<BenchmarkFile[]> {
  const benchmarksDir = path.resolve(process.cwd(), "benchmarks");
  const entries = await fs.readdir(benchmarksDir);

  const jsonFiles = entries
    .filter(
      (file) =>
        file.endsWith(".json") &&
        file.includes("benchmark-results") &&
        /\d{4}-\d{2}-\d{2}T/.test(file) &&
        !file.includes("merged"),
    )
    .sort();

  const files: BenchmarkFile[] = [];

  for (const file of jsonFiles) {
    const filePath = path.join(benchmarksDir, file);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const results = JSON.parse(content);
      if (!Array.isArray(results)) continue;
      files.push({ filePath, results, trailingNewline: content.endsWith("\n") });
    } catch (error) {
      console.warn(`⚠️ Skipping unreadable benchmark file ${file}: ${error instanceof Error ? error.message : error}`);
    }
  }

  return files;
}

/**
 * Work out which Ollama models still need a speed measurement, and in which files
 */
function collectWork(files: BenchmarkFile[], force: boolean): { work: ModelWork[]; alreadyMeasured: Set<string> } {
  const work = new Map<string, ModelWork>();
  const alreadyMeasured = new Set<string>();

  for (const file of files) {
    const ollamaResults = file.results.filter(isOllamaResult);
    const modelIds = new Set(ollamaResults.map((r) => r.modelId));

    for (const modelId of modelIds) {
      const modelResults = ollamaResults.filter((r) => r.modelId === modelId);
      const needsMeasurement = force || modelResults.some((r) => !hasTps(r));

      if (!needsMeasurement) {
        alreadyMeasured.add(modelId);
        continue;
      }

      if (!work.has(modelId)) {
        work.set(modelId, { modelId, files: [] });
      }
      work.get(modelId)!.files.push(file);
    }
  }

  return { work: Array.from(work.values()), alreadyMeasured };
}

/**
 * Send one benchmark prompt to the model and derive tokens per second from Ollama's timings
 */
async function measureModel(
  client: ReturnType<typeof createOllamaClient>,
  modelId: string,
  testName: string,
  prompt: string,
): Promise<Measurement> {
  // Warm-up: make sure the model is loaded and the first real request is not
  // paying for weight loading. eval_duration excludes load time anyway, but a
  // cold model can still produce a slower first decode.
  await client.chat({
    model: modelId,
    messages: [{ role: "user", content: "Say hi." }],
    stream: false,
    options: { num_predict: 1 },
  });

  const response = await client.chat({
    model: modelId,
    messages: [
      { role: "system", content: DEFAULT_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    stream: false,
    options: { temperature: 0 },
  });

  const evalCount = response.eval_count ?? 0;
  const evalDurationNs = response.eval_duration ?? 0;

  if (evalCount <= 0 || evalDurationNs <= 0) {
    throw new Error(
      `Ollama did not report generation timings (eval_count=${evalCount}, eval_duration=${evalDurationNs})`,
    );
  }

  const promptEvalCount = response.prompt_eval_count ?? 0;
  const promptEvalDurationNs = response.prompt_eval_duration ?? 0;

  const tps = evalCount / (evalDurationNs / 1e9);
  const promptTps = promptEvalDurationNs > 0 ? promptEvalCount / (promptEvalDurationNs / 1e9) : 0;

  return {
    tps: round(tps),
    details: {
      testName,
      evalCount,
      evalDurationNs,
      promptEvalCount,
      promptEvalDurationNs,
      promptTps: round(promptTps),
      loadDurationNs: response.load_duration ?? 0,
      measuredAt: new Date().toISOString(),
    },
  };
}

function round(value: number, decimals: number = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Ask Ollama to unload the model so the next one gets the full GPU
 */
async function unloadModel(client: ReturnType<typeof createOllamaClient>, modelId: string): Promise<void> {
  try {
    await client.generate({ model: modelId, prompt: "", keep_alive: 0 });
  } catch (error) {
    console.warn(`⚠️ Could not unload ${modelId}: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Write the measurement into every result entry for the model in the given file
 */
async function writeMeasurement(file: BenchmarkFile, modelId: string, measurement: Measurement): Promise<number> {
  let updated = 0;

  for (const result of file.results) {
    if (isOllamaResult(result) && result.modelId === modelId) {
      result.tps = measurement.tps;
      result.tpsDetails = measurement.details;
      updated++;
    }
  }

  const json = JSON.stringify(file.results, null, 2) + (file.trailingNewline ? "\n" : "");
  await fs.writeFile(file.filePath, json);

  return updated;
}

async function main(): Promise<void> {
  const options = parseCliOptions();
  const host = getOllamaHost();
  const testName = process.env.OLLAMA_TPS_TEST || DEFAULT_TEST_NAME;
  const pullMissing = process.env.OLLAMA_TPS_PULL === "true";

  console.log("⚡ Measuring Ollama generation speed (tokens per second)...");
  console.log(`👉 Ollama host: ${host}`);
  console.log(`👉 Test prompt: ${testName}`);

  const tests = await loadTestDefinitions();
  const test = tests.find((t) => t.name === testName);
  if (!test) {
    throw new Error(`Unknown test "${testName}". Available tests: ${tests.map((t) => t.name).join(", ")}`);
  }
  const prompt = await fs.readFile(test.promptPath, "utf-8");

  const files = await loadBenchmarkFiles();
  const { work, alreadyMeasured } = collectWork(files, options.force);

  console.log(`🔍 Scanned ${files.length} benchmark files`);
  if (alreadyMeasured.size > 0) {
    console.log(
      `⏭️ ${alreadyMeasured.size} Ollama model(s) already have a tps value: ${Array.from(alreadyMeasured).join(", ")}`,
    );
  }

  if (work.length === 0) {
    console.log("✅ Nothing to do - every Ollama model already has a tps value.");
    return;
  }

  console.log(`📋 ${work.length} Ollama model(s) to measure:`);
  for (const item of work) {
    console.log(`   - ${item.modelId} (${item.files.map((f) => path.basename(f.filePath)).join(", ")})`);
  }

  if (options.dryRun) {
    console.log("🏁 Dry run - no requests sent, no files changed.");
    return;
  }

  const client = createOllamaClient(host);

  // Models present on the host, so we can tell a missing model from a failed request
  const installed = new Set((await client.list()).models.map((m) => m.name));

  const measured: Array<{ modelId: string; measurement: Measurement }> = [];
  const failed: Array<{ modelId: string; reason: string }> = [];

  for (let i = 0; i < work.length; i++) {
    const { modelId, files: modelFiles } = work[i];
    console.log(`\n🤖 [${i + 1}/${work.length}] ${modelId}`);

    try {
      if (!installed.has(modelId)) {
        if (!pullMissing) {
          throw new Error("model is not installed on the Ollama host (set OLLAMA_TPS_PULL=true to pull it)");
        }
        console.log(`⬇️ Pulling ${modelId}...`);
        await client.pull({ model: modelId, stream: false });
        installed.add(modelId);
      }

      console.log("🔥 Warming up...");
      const started = Date.now();
      const measurement = await measureModel(client, modelId, test.name, prompt);
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);

      console.log(
        `📈 ${measurement.tps} tok/s (${measurement.details.evalCount} tokens, prompt ${measurement.details.promptTps} tok/s, ${elapsed}s wall time)`,
      );

      for (const file of modelFiles) {
        const updated = await writeMeasurement(file, modelId, measurement);
        console.log(`💾 Updated ${updated} result(s) in ${path.basename(file.filePath)}`);
      }

      measured.push({ modelId, measurement });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${modelId}: ${reason}`);
      failed.push({ modelId, reason });
    } finally {
      if (installed.has(modelId)) {
        await unloadModel(client, modelId);
      }
    }
  }

  console.log("\n📊 Summary");
  for (const { modelId, measurement } of measured) {
    console.log(`   ${measurement.tps.toFixed(1).padStart(8)} tok/s  ${modelId}`);
  }
  for (const { modelId, reason } of failed) {
    console.log(`   ${"failed".padStart(8)}        ${modelId} (${reason})`);
  }

  if (measured.length > 0) {
    console.log("\n👉 Run `pnpm build` to regenerate the merged results and HTML with the new speed figures.");
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Error measuring Ollama speed:", error);
  process.exit(1);
});
