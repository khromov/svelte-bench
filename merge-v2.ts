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
    const isoTimestamp = match[1].replace(
      /T(\d{2})-(\d{2})-(\d{2})/,
      "T$1:$2:$3"
    );
    return new Date(isoTimestamp);
  }
  return null;
}

/**
 * Get all v2 benchmark JSON files from the benchmarks directory
 */
async function getV2BenchmarkFiles(): Promise<string[]> {
  const benchmarksDir = path.resolve(process.cwd(), "benchmarks");
  const files = await fs.readdir(benchmarksDir);

  // Filter for v2 JSON files only, exclude the merged file itself,
  // and importantly, exclude files with "with-context" in the name
  return files
    .filter(
      (file) =>
        file.endsWith(".json") &&
        file.includes("benchmark-results") &&
        file.includes("-v2-") && // Only v2 files
        !file.includes("with-context") &&
        file !== "benchmark-results-merged-v2.json"
    )
    .map((file) => path.join(benchmarksDir, file));
}

/**
 * Read and parse a benchmark file, filtering for v2 results
 */
async function readV2BenchmarkFile(filePath: string): Promise<HumanEvalResult[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const results = JSON.parse(content);
    
    // Filter to only include v2 results (some files might be mixed)
    return results.filter((result: any) => result.version === "v2");
  } catch (error) {
    console.error(`Error reading benchmark file ${filePath}:`, error);
    return [];
  }
}

/**
 * Find the latest v2 file for each provider/model combination
 */
async function findLatestV2ResultsForEachModel(): Promise<
  Map<string, LatestFileInfo>
> {
  const benchmarkFiles = await getV2BenchmarkFiles();
  const latestFiles = new Map<string, LatestFileInfo>();

  console.log(
    `🔍 Found ${benchmarkFiles.length} eligible v2 benchmark files (excluding with-context files)`
  );

  for (const filePath of benchmarkFiles) {
    const filename = path.basename(filePath);
    const timestamp = extractTimestamp(filename);

    // Skip files where we can't extract a timestamp
    if (!timestamp) {
      console.warn(`⚠️ Skipping file with unparseable timestamp: ${filename}`);
      continue;
    }

    // Read the v2 results from this file
    const results = await readV2BenchmarkFile(filePath);

    // Group by provider/model combinations
    for (const result of results) {
      const key = `${result.provider}-${result.modelId}`;

      if (
        !latestFiles.has(key) ||
        timestamp > latestFiles.get(key)!.timestamp
      ) {
        latestFiles.set(key, {
          filePath,
          timestamp,
          results: results.filter(
            (r) =>
              r.provider === result.provider && r.modelId === result.modelId
          ),
        });
      }
    }
  }

  return latestFiles;
}

/**
 * Merge the latest v2 results and save to a new file
 */
async function mergeAndSaveV2Results(): Promise<void> {
  console.log("🔄 Merging v2-only benchmark results...");

  // Get the latest v2 results for each provider/model
  const latestResultsMap = await findLatestV2ResultsForEachModel();

  // Merge all v2 results
  const mergedResults: HumanEvalResult[] = [];
  const includedFiles = new Set<string>();

  for (const [key, info] of latestResultsMap.entries()) {
    console.log(
      `📊 Including v2 results for ${key} from ${path.basename(info.filePath)}`
    );
    mergedResults.push(...info.results);
    includedFiles.add(info.filePath);
  }

  // Save merged v2 results
  await ensureBenchmarksDir();
  const outputPath = path.resolve(
    process.cwd(),
    "benchmarks",
    "benchmark-results-merged-v2.json"
  );

  await fs.writeFile(outputPath, JSON.stringify(mergedResults, null, 2));

  console.log(
    `\n✅ Successfully merged v2 results from ${includedFiles.size} files`
  );
  console.log(`✅ Total provider/model combinations: ${latestResultsMap.size}`);
  console.log(`✅ Total v2 result entries: ${mergedResults.length}`);
  console.log(`✅ Merged v2 results saved to: ${outputPath}`);
}

// Run the merge process
mergeAndSaveV2Results().catch((error) => {
  console.error("Error merging v2 benchmark results:", error);
  process.exit(1);
});