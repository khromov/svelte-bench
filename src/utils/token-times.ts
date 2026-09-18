import fs from "fs/promises";
import path from "path";
import type { TokenTimeSample, TokenTimes } from "./humaneval";
import { modelFileName, round } from "./ollama-results";

/**
 * Storage for the per-model response size measurements produced by
 * ollama-token-times.ts and consumed by merge.ts.
 *
 * Each Ollama model gets its own file in benchmarks/token-times-ollama/ so a
 * measurement can be resumed or redone for one model without touching the rest.
 */

export const TOKEN_TIMES_DIR_NAME = "token-times-ollama";

/** What is stored on disk: the measurement itself, tagged with the model it belongs to */
export interface TokenTimesFile extends Omit<TokenTimes, "avgResponseSeconds"> {
  provider: string;
  modelId: string;
  /** The system prompt every sample was sent with (the user prompt is stored per sample) */
  systemPrompt?: string;
}

export function getTokenTimesDir(): string {
  return path.resolve(process.cwd(), "benchmarks", TOKEN_TIMES_DIR_NAME);
}

export function getTokenTimesFilePath(modelId: string): string {
  return path.join(getTokenTimesDir(), `${modelFileName(modelId)}.json`);
}

/**
 * Averages over the recorded samples, in the shape stored in the file
 */
export function summarizeSamples(samples: TokenTimeSample[]): Omit<TokenTimesFile, "provider" | "modelId"> {
  const count = samples.length;
  const mean = (pick: (sample: TokenTimeSample) => number) =>
    count > 0 ? samples.reduce((sum, sample) => sum + pick(sample), 0) / count : 0;

  return {
    sampleCount: count,
    avgOutputTokens: round(
      mean((s) => s.evalCount),
      1,
    ),
    avgPromptTokens: round(
      mean((s) => s.promptEvalCount),
      1,
    ),
    avgEvalDurationNs: Math.round(mean((s) => s.evalDurationNs)),
    measuredAt: samples.reduce((latest, s) => (s.measuredAt > latest ? s.measuredAt : latest), ""),
    samples,
  };
}

/**
 * Read one model's measurement file, or null when it does not exist yet
 */
export async function readTokenTimesFile(modelId: string): Promise<TokenTimesFile | null> {
  try {
    const content = await fs.readFile(getTokenTimesFilePath(modelId), "utf-8");
    const parsed = JSON.parse(content);
    return isTokenTimesFile(parsed) ? parsed : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeTokenTimesFile(data: TokenTimesFile): Promise<string> {
  const filePath = getTokenTimesFilePath(data.modelId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
  return filePath;
}

/**
 * Load every measurement file, keyed by model id. Missing directory means no measurements.
 */
export async function loadAllTokenTimes(): Promise<Map<string, TokenTimesFile>> {
  const dir = getTokenTimesDir();
  const byModel = new Map<string, TokenTimesFile>();

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return byModel;
    throw error;
  }

  for (const entry of entries.filter((file) => file.endsWith(".json")).sort()) {
    const filePath = path.join(dir, entry);
    try {
      const parsed = JSON.parse(await fs.readFile(filePath, "utf-8"));
      if (!isTokenTimesFile(parsed)) {
        console.warn(`⚠️ Skipping ${TOKEN_TIMES_DIR_NAME}/${entry}: not a token-times measurement`);
        continue;
      }
      byModel.set(parsed.modelId, parsed);
    } catch (error) {
      console.warn(
        `⚠️ Skipping unreadable ${TOKEN_TIMES_DIR_NAME}/${entry}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  return byModel;
}

/**
 * Turn a stored measurement into the record attached to benchmark results,
 * estimating the response time from the model's tokens per second
 */
export function toTokenTimes(file: TokenTimesFile, tps: number | undefined): TokenTimes {
  const { provider: _provider, modelId: _modelId, systemPrompt: _systemPrompt, ...measurement } = file;
  const hasTps = typeof tps === "number" && Number.isFinite(tps) && tps > 0;

  return {
    ...measurement,
    // The prompts and responses are for manual validation only; keep them out of the report
    samples: measurement.samples.map(
      ({ prompt: _prompt, response: _response, thinking: _thinking, ...sample }) => sample,
    ),
    avgResponseSeconds: hasTps && measurement.sampleCount > 0 ? round(measurement.avgOutputTokens / tps, 1) : null,
  };
}

function isTokenTimesFile(value: unknown): value is TokenTimesFile {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as TokenTimesFile).modelId === "string" &&
    Array.isArray((value as TokenTimesFile).samples)
  );
}
