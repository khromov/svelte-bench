import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import { ensureBenchmarksDir } from "./src/utils/test-manager";
import { type HumanEvalResult } from "./src/utils/humaneval";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load all benchmark results from the benchmarks directory
 */
async function loadBenchmarkFiles(): Promise<
  Array<{ name: string; path: string; mtime: number }>
> {
  await ensureBenchmarksDir();

  const benchmarksDir = path.resolve(process.cwd(), "benchmarks");
  const files = await fs.readdir(benchmarksDir);

  // Filter only JSON files
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  // Get file details with modification time
  const fileDetails = await Promise.all(
    jsonFiles.map(async (file) => {
      const filePath = path.join(benchmarksDir, file);
      const stats = await fs.stat(filePath);
      return {
        name: file,
        path: filePath,
        mtime: stats.mtime.getTime(),
      };
    })
  );

  // Sort all files by name using reverse natural sort order (Z to A)
  // By swapping the arguments (b, a instead of a, b), we get the reverse order
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
  const sortedProviders = Object.keys(byProvider).sort((a, b) =>
    a.localeCompare(b)
  );

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
      .reduce((acc, [model, results]) => {
        acc[model] = results;
        return acc;
      }, {} as Record<string, any[]>);

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
  benchmarkFiles: Array<{ name: string; path: string; mtime: number }>
): Promise<string> {
  const groupedResults = groupBenchmarkResults(benchmarkData);
  const benchmarkDataB64 = Buffer.from(JSON.stringify(groupedResults)).toString(
    "base64"
  );

  // Format benchmark files for the template
  const formattedBenchmarkFiles = benchmarkFiles.map((file) => ({
    name: file.name,
    path: file.path,
  }));

  // Check if context information is present in the results
  const hasContext = benchmarkData.some(
    (result) => result.context && result.context.used
  );

  const contextInfo = hasContext
    ? {
        filename: benchmarkData[0]?.context?.filename || "",
        content: benchmarkData[0]?.context?.content || "",
      }
    : null;

  // Load the EJS template
  const templatePath = path.join(__dirname, "views", "index.ejs");
  const template = await fs.readFile(templatePath, "utf-8");

  // Render the template with our data - include filename option for includes
  const html = ejs.render(template, {
    benchmarkFiles: formattedBenchmarkFiles,
    selectedFile: fileName,
    groupedResults,
    benchmarkDataB64,
    contextInfo,
    isStaticBuild: true,
  }, {
    filename: templatePath, // This tells EJS where to resolve includes from
  });

  return html;
}

/**
 * Generate an index HTML file that lists all benchmark results
 */
async function generateIndexHTML(
  benchmarkFiles: Array<{ name: string; path: string; mtime: number }>
): Promise<string> {
  // Load the EJS template
  const templatePath = path.join(__dirname, "views", "index.ejs");
  const template = await fs.readFile(templatePath, "utf-8");

  // Format benchmark files for the template
  const formattedBenchmarkFiles = benchmarkFiles.map((file) => ({
    name: file.name,
    path: file.path,
  }));

  // Render the template with minimal data to show just the file list
  const html = ejs.render(template, {
    benchmarkFiles: formattedBenchmarkFiles,
    selectedFile: null,
    groupedResults: [],
    benchmarkDataB64: "",
    isStaticBuild: true,
    isIndexPage: true,
  }, {
    filename: templatePath, // This tells EJS where to resolve includes from
  });

  return html;
}

/**
 * Check if the merged benchmark results file exists
 */
async function checkForMergedResultsFile(): Promise<string | null> {
  const mergedFilePath = path.resolve(
    process.cwd(),
    "benchmarks",
    "benchmark-results-merged.json"
  );

  try {
    await fs.access(mergedFilePath);
    return mergedFilePath;
  } catch (error) {
    // File doesn't exist or isn't accessible
    return null;
  }
}

/**
 * Main function to build all the static HTML files
 */
async function buildStaticFiles(): Promise<void> {
  try {
    console.log("🔨 Building static HTML files...");

    // Get all benchmark files
    const benchmarkFiles = await loadBenchmarkFiles();

    // Create an index.html file
    const indexHtml = await generateIndexHTML(benchmarkFiles);
    const indexHtmlPath = path.resolve(
      process.cwd(),
      "benchmarks",
      "index.html"
    );
    await fs.writeFile(indexHtmlPath, indexHtml);
    console.log(`📝 Created index.html at ${indexHtmlPath}`);

    if (benchmarkFiles.length === 0) {
      console.log("⚠️ No benchmark files found.");
      return;
    }

    // Process each benchmark file and generate corresponding HTML
    for (const file of benchmarkFiles) {
      console.log(`🔄 Processing ${file.name}...`);

      // Load the benchmark data
      const benchmarkData = await loadBenchmarkData(file.path);

      // Generate HTML
      const html = await generateBenchmarkHTML(
        benchmarkData,
        file.name,
        benchmarkFiles
      );

      // Write HTML file
      const htmlFileName = file.name.replace(".json", ".html");
      const htmlFilePath = path.resolve(
        process.cwd(),
        "benchmarks",
        htmlFileName
      );
      await fs.writeFile(htmlFilePath, html);

      console.log(`📝 Created ${htmlFileName}`);
    }

    // Check for merged results file and process it
    const mergedFilePath = await checkForMergedResultsFile();
    if (mergedFilePath) {
      console.log(`🔄 Processing merged results file...`);

      // Load the merged benchmark data
      const mergedBenchmarkData = await loadBenchmarkData(mergedFilePath);

      // Generate HTML for merged results
      const mergedHtml = await generateBenchmarkHTML(
        mergedBenchmarkData,
        "benchmark-results-merged.json",
        benchmarkFiles
      );

      // Write HTML file for merged results
      const mergedHtmlFilePath = path.resolve(
        process.cwd(),
        "benchmarks",
        "benchmark-results-merged.html"
      );
      await fs.writeFile(mergedHtmlFilePath, mergedHtml);

      console.log(`📝 Created benchmark-results-merged.html`);
    } else {
      console.log(
        `ℹ️ No merged results file found. Run 'npm run merge' to create one.`
      );
    }

    console.log("✅ Static HTML build complete!");
  } catch (error) {
    console.error("Error building static HTML:", error);
    process.exit(1);
  }
}

// Run the build
buildStaticFiles();
