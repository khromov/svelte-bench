import fs from "fs/promises";
import path from "path";
import type { Ollama } from "ollama";
import type { HumanEvalResult } from "./humaneval";

/**
 * Helpers shared by the scripts that post-process Ollama benchmark results
 * (ollama-tps.ts, ollama-token-times.ts): finding the Ollama models that have
 * been benchmarked and talking to the Ollama host about them.
 */

export const OLLAMA_PROVIDER_NAME = "ollama";

export interface BenchmarkFile {
  filePath: string;
  results: HumanEvalResult[];
  /** Whether the original file ended with a newline, so we write it back the same way */
  trailingNewline: boolean;
}

export function isOllamaResult(result: HumanEvalResult): boolean {
  return typeof result.provider === "string" && result.provider.toLowerCase() === OLLAMA_PROVIDER_NAME;
}

/**
 * Load every timestamped benchmark JSON file (the merged file is derived, so it is skipped)
 */
export async function loadBenchmarkFiles(): Promise<BenchmarkFile[]> {
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
 * Ollama normalises model names when it stores them: a name without a tag gets
 * ":latest", and tags are case-insensitive. Compare names the same way so a
 * model benchmarked as "org/model" is found even though Ollama lists it as
 * "org/model:latest".
 */
export function normalizeModelName(name: string): string {
  const lastSlash = name.lastIndexOf("/");
  const hasTag = name.indexOf(":", lastSlash + 1) !== -1;
  return (hasTag ? name : `${name}:latest`).toLowerCase();
}

/**
 * Turn a model id into something safe to use as a file name ("gpt-oss:20b" -> "gpt-oss_20b")
 */
export function modelFileName(modelId: string): string {
  return modelId.replace(/[\/:]/g, "_");
}

export function round(value: number, decimals: number = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * The models present on the Ollama host, in normalised form
 */
export async function listInstalledModels(client: Ollama): Promise<Set<string>> {
  return new Set((await client.list()).models.map((m) => normalizeModelName(m.name)));
}

/**
 * Make sure a model is available on the host, pulling it when allowed.
 * `pullHint` names the switch that enables pulling, for the error message.
 */
export async function ensureModelInstalled(
  client: Ollama,
  installed: Set<string>,
  modelId: string,
  pullMissing: boolean,
  pullHint: string,
): Promise<void> {
  if (installed.has(normalizeModelName(modelId))) return;

  if (!pullMissing) {
    throw new Error(`model is not installed on the Ollama host (set ${pullHint} to pull it)`);
  }

  console.log(`⬇️ Pulling ${modelId}...`);
  await client.pull({ model: modelId, stream: false });
  installed.add(normalizeModelName(modelId));
}

/**
 * Make sure the model is loaded so the first real request is not paying for
 * weight loading. eval_duration excludes load time anyway, but a cold model
 * can still produce a slower first decode.
 */
export async function warmUpModel(client: Ollama, modelId: string): Promise<void> {
  await client.chat({
    model: modelId,
    messages: [{ role: "user", content: "Say hi." }],
    stream: false,
    options: { num_predict: 1 },
  });
}

/**
 * Ask Ollama to unload the model so the next one gets the full GPU
 */
export async function unloadModel(client: Ollama, modelId: string): Promise<void> {
  try {
    await client.generate({ model: modelId, prompt: "", keep_alive: 0 });
  } catch (error) {
    console.warn(`⚠️ Could not unload ${modelId}: ${error instanceof Error ? error.message : error}`);
  }
}
