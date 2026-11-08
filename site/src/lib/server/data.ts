import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Result } from "#lib/results.js";
import { modelUrl } from "../../../../src/utils/model-url.js";
const root = path.resolve(process.cwd(), "../benchmarks");
export async function files(legacy = false) {
  const names = await readdir(path.join(root, legacy ? "v1" : ""));
  return names
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }));
}
export async function readResults(name: string, legacy: boolean): Promise<Result[]> {
  if (!(await files(legacy)).includes(name)) throw new Error(`Unknown result: ${name}`);
  const results: Result[] = JSON.parse(await readFile(path.join(root, legacy ? "v1" : "", name), "utf8"));
  return results.map((result) => ({ ...result, modelUrl: modelUrl(result.modelId, result.modelUrl, result.provider) }));
}
