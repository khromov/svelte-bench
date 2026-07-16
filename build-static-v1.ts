import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import { type HumanEvalResult } from "./src/utils/humaneval";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load all benchmark results from the benchmarks/v1 directory
 */
async function loadBenchmarkFiles(): Promise<Array<{ name: string; path: string; mtime: number }>> {
  const benchmarksDir = path.resolve(process.cwd(), "benchmarks", "v1");
  const files = await fs.readdir(benchmarksDir);

  // Filter only JSON files
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  // Get file details with modification time
  const fileDetails = await Promise.all(
    jsonFiles.map(async (file) => {
      const filePath = path.join(benchmarksDir, file);
      const stats = await fs.stat(filePath);
      return {
        name: file.replace(/^v1-/, ""), // Remove v1- prefix if present
        path: filePath,
        mtime: stats.mtime.getTime(),
      };
    }),
  );

  // Sort all files by name using reverse natural sort order (Z to A)
  fileDetails.sort((a, b) => {
    return b.name.localeCompare(a.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  return fileDetails;
}

/**
 * Load a benchmark file
 */
async function loadBenchmarkData(filePath: string): Promise<any[]> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading benchmark file ${filePath}:`, error);
    throw error;
  }
}

interface ProviderData {
  provider: string;
  models: Record<string, any[]>;
}

/**
 * Group benchmark results by provider and model
 */
function groupBenchmarkResults(results: HumanEvalResult[]): ProviderData[] {
  // Group by provider
  const byProvider: Record<string, HumanEvalResult[]> = {};

  results.forEach((result) => {
    if (!byProvider[result.provider]) {
      byProvider[result.provider] = [];
    }
    byProvider[result.provider].push(result);
  });

  // Sort providers alphabetically
  const sortedProviders = Object.keys(byProvider).sort((a, b) => a.localeCompare(b));

  // Build the final structure
  const groupedResults: ProviderData[] = [];

  for (const provider of sortedProviders) {
    const providerData: ProviderData = {
      provider,
      models: {} as Record<string, any[]>,
    };

    // Group by model
    byProvider[provider].forEach((result) => {
      if (!providerData.models[result.modelId]) {
        providerData.models[result.modelId] = [];
      }
      providerData.models[result.modelId].push(result);
    });

    // Sort models alphabetically
    providerData.models = Object.entries(providerData.models)
      .sort(([modelA], [modelB]) => modelA.localeCompare(modelB))
      .reduce(
        (acc, [model, results]) => {
          acc[model] = results;
          return acc;
        },
        {} as Record<string, any[]>,
      );

    groupedResults.push(providerData);
  }

  return groupedResults;
}

/**
 * Generate HTML content for a single benchmark result using EJS
 */
async function generateBenchmarkHTML(
  benchmarkData: HumanEvalResult[],
  fileName: string,
  benchmarkFiles: Array<{ name: string; path: string; mtime: number }>,
): Promise<string> {
  const groupedResults = groupBenchmarkResults(benchmarkData);
  const benchmarkDataB64 = Buffer.from(JSON.stringify(groupedResults)).toString("base64");

  // Format benchmark files for the template
  const formattedBenchmarkFiles = benchmarkFiles.map((file) => ({
    name: file.name,
    path: file.path,
  }));

  // Check if context information is present in the results
  const hasContext = benchmarkData.some((result) => result.context && result.context.used);

  const contextInfo = hasContext
    ? {
        filename: benchmarkData[0]?.context?.filename || "",
        content: benchmarkData[0]?.context?.content || "",
      }
    : null;

  // Load the EJS template
  const templatePath = path.join(__dirname, "views", "index-v1.ejs");
  const template = await fs.readFile(templatePath, "utf-8");

  // Render the template with our data - include filename option for includes
  const html = ejs.render(
    template,
    {
      benchmarkFiles: formattedBenchmarkFiles,
      selectedFile: fileName,
      groupedResults,
      benchmarkDataB64,
      contextInfo,
      isStaticBuild: true,
      isV1Build: true, // Add flag for v1 builds
    },
    {
      filename: templatePath, // This tells EJS where to resolve includes from
    },
  );

  return html;
}

/**
 * Main function to build all the static HTML files for v1
 */
async function buildStaticFiles(): Promise<void> {
  try {
    console.log("🔨 Building static HTML files for v1 results...");

    // Get all benchmark files
    const benchmarkFiles = await loadBenchmarkFiles();

    if (benchmarkFiles.length === 0) {
      console.log("⚠️ No v1 benchmark files found.");
      return;
    }

    // Process each benchmark file and generate corresponding HTML
    for (const file of benchmarkFiles) {
      console.log(`🔄 Processing ${file.name}...`);

      // Load the benchmark data
      const benchmarkData = await loadBenchmarkData(file.path);

      // Generate HTML
      const html = await generateBenchmarkHTML(benchmarkData, file.name, benchmarkFiles);

      // Write HTML file with v1- prefix
      const htmlFileName = `v1-${file.name.replace(".json", ".html")}`;
      const htmlFilePath = path.resolve(process.cwd(), "benchmarks", "v1", htmlFileName);
      await fs.writeFile(htmlFilePath, html);

      console.log(`📝 Created ${htmlFileName}`);
    }

    console.log("✅ Static HTML build for v1 results complete!");
  } catch (error) {
    console.error("Error building static HTML:", error);
    process.exit(1);
  }
}

// Run the build
buildStaticFiles();
