import fs from "fs/promises";
import path from "path";
import type { HumanEvalResult } from "./src/utils/humaneval";
import { ensureBenchmarksDir } from "./src/utils/test-manager";

/**
 * Interface to track the latest file for each provider/model combination
 */
interface LatestFileInfo {
  filePath: string;
  timestamp: Date;
  results: HumanEvalResult[];
}

/**
 * Extract timestamp from benchmark filename
 */
function extractTimestamp(filename: string): Date | null {
  // Match timestamp in format like benchmark-results-2023-10-15T12-34-56.123Z.json
  const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)/);
  if (match && match[1]) {
    // Replace dashes with colons in the time part to make a valid ISO string
    const isoTimestamp = match[1].replace(/T(\d{2})-(\d{2})-(\d{2})/, "T$1:$2:$3");
    return new Date(isoTimestamp);
  }
  return null;
}

/**
 * Get all benchmark JSON files from the benchmarks directory
 */
async function getBenchmarkFiles(): Promise<string[]> {
  const benchmarksDir = path.resolve(process.cwd(), "benchmarks");
  const files = await fs.readdir(benchmarksDir);

  // Filter for JSON files only, exclude the merged file itself,
  // and importantly, exclude files with "with-context" in the name
  return files
    .filter(
      (file) =>
        file.endsWith(".json") &&
        file.includes("benchmark-results") &&
        /\d{4}-\d{2}-\d{2}T/.test(file) && // Include timestamped files (year-agnostic)
        !file.includes("with-context") &&
        file !== "benchmark-results-merged.json",
    )
    .map((file) => path.join(benchmarksDir, file));
}

/**
 * Read and parse a benchmark file
 */
async function readBenchmarkFile(filePath: string): Promise<HumanEvalResult[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const results = JSON.parse(content);

    // Return results (excluding v1 results if they have version field)
    return results.filter((result: any) => !result.version || result.version !== "v1");
  } catch (error) {
    console.error(`Error reading benchmark file ${filePath}:`, error);
    return [];
  }
}

/**
 * Find the latest file for each provider/model combination
 */
async function findLatestResultsForEachModel(): Promise<Map<string, LatestFileInfo>> {
  const benchmarkFiles = await getBenchmarkFiles();
  const latestFiles = new Map<string, LatestFileInfo>();

  console.log(`🔍 Found ${benchmarkFiles.length} eligible benchmark files (excluding with-context files)`);

  for (const filePath of benchmarkFiles) {
    const filename = path.basename(filePath);
    const timestamp = extractTimestamp(filename);

    // Skip files where we can't extract a timestamp
    if (!timestamp) {
      console.warn(`⚠️ Skipping file with unparseable timestamp: ${filename}`);
      continue;
    }

    // Read the results from this file
    const results = await readBenchmarkFile(filePath);

    // Group by provider/model combinations
    for (const result of results) {
      const key = `${result.provider}-${result.modelId}`;

      if (!latestFiles.has(key) || timestamp > latestFiles.get(key)!.timestamp) {
        latestFiles.set(key, {
          filePath,
          timestamp,
          results: results.filter((r) => r.provider === result.provider && r.modelId === result.modelId),
        });
      }
    }
  }

  return latestFiles;
}

/**
 * Merge the latest results and save to a new file
 */
async function mergeAndSaveResults(): Promise<void> {
  console.log("🔄 Merging benchmark results...");

  // Get the latest results for each provider/model
  const latestResultsMap = await findLatestResultsForEachModel();

  // Merge all results
  const mergedResults: HumanEvalResult[] = [];
  const includedFiles = new Set<string>();

  for (const [key, info] of latestResultsMap.entries()) {
    console.log(`📊 Including results for ${key} from ${path.basename(info.filePath)}`);
    mergedResults.push(...info.results);
    includedFiles.add(info.filePath);
  }

  // Save merged results
  await ensureBenchmarksDir();
  const outputPath = path.resolve(process.cwd(), "benchmarks", "benchmark-results-merged.json");

  await fs.writeFile(outputPath, JSON.stringify(mergedResults, null, 2));

  console.log(`\n✅ Successfully merged results from ${includedFiles.size} files`);
  console.log(`✅ Total provider/model combinations: ${latestResultsMap.size}`);
  console.log(`✅ Total result entries: ${mergedResults.length}`);
  console.log(`✅ Merged results saved to: ${outputPath}`);
}

// Run the merge process
mergeAndSaveResults().catch((error) => {
  console.error("Error merging benchmark results:", error);
  process.exit(1);
});
