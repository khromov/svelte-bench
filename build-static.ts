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
 * Check if merged benchmark results file exists
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
 * Check if v1 merged benchmark results file exists
 */
async function checkForV1MergedResultsFile(): Promise<string | null> {
  const mergedFilePath = path.resolve(
    process.cwd(),
    "benchmarks",
    "v1",
    "v1-benchmark-results-merged.json"
  );

  try {
    await fs.access(mergedFilePath);
    return mergedFilePath;
  } catch (error) {
    // File doesn't exist or doesn't exist
    return null;
  }
}

/**
 * Generate HTML content for v1 benchmark results using EJS
 */
async function generateV1BenchmarkHTML(
  benchmarkData: HumanEvalResult[],
  fileName: string
): Promise<string> {
  const groupedResults = groupBenchmarkResults(benchmarkData);
  const benchmarkDataB64 = Buffer.from(JSON.stringify(groupedResults)).toString(
    "base64"
  );

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

  // Load the v1 EJS template
  const templatePath = path.join(__dirname, "views", "index-v1.ejs");
  const template = await fs.readFile(templatePath, "utf-8");

  // Render the template with our data - include filename option for includes
  const html = ejs.render(template, {
    benchmarkFiles: [],
    selectedFile: fileName,
    groupedResults,
    benchmarkDataB64,
    contextInfo,
    isStaticBuild: true,
    isV1Build: true,
  }, {
    filename: templatePath, // This tells EJS where to resolve includes from
  });

  return html;
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
      const mergedFileName = path.basename(mergedFilePath);
      console.log(`🔄 Processing merged results file: ${mergedFileName}`);

      // Load the merged benchmark data
      const mergedBenchmarkData = await loadBenchmarkData(mergedFilePath);

      // Generate HTML for merged results
      const mergedHtml = await generateBenchmarkHTML(
        mergedBenchmarkData,
        mergedFileName,
        benchmarkFiles
      );

      // Write HTML file for merged results
      const htmlFileName = mergedFileName.replace('.json', '.html');
      const mergedHtmlFilePath = path.resolve(
        process.cwd(),
        "benchmarks",
        htmlFileName
      );
      await fs.writeFile(mergedHtmlFilePath, mergedHtml);

      console.log(`📝 Created ${htmlFileName}`);
    } else {
      console.log(
        `ℹ️ No merged results file found. Run 'npm run merge' to create one.`
      );
    }

    // Check for v1 merged results file and process it
    const v1MergedFilePath = await checkForV1MergedResultsFile();
    if (v1MergedFilePath) {
      const v1MergedFileName = path.basename(v1MergedFilePath);
      console.log(`🔄 Processing v1 merged results file: ${v1MergedFileName}`);

      // Load the v1 merged benchmark data
      const v1MergedBenchmarkData = await loadBenchmarkData(v1MergedFilePath);

      // Generate HTML for v1 merged results
      const v1MergedHtml = await generateV1BenchmarkHTML(
        v1MergedBenchmarkData,
        v1MergedFileName
      );

      // Write HTML file for v1 merged results  
      const v1HtmlFileName = v1MergedFileName.replace('.json', '.html');
      const v1MergedHtmlFilePath = path.resolve(
        process.cwd(),
        "benchmarks",
        "v1",
        v1HtmlFileName
      );
      await fs.writeFile(v1MergedHtmlFilePath, v1MergedHtml);

      console.log(`📝 Created v1/${v1HtmlFileName}`);
    } else {
      console.log(
        `ℹ️ No v1 merged results file found. Creating merged v1 results from all v1 files...`
      );

      // Create proper v1 merged results using the same logic as the main merge
      try {
        console.log(`🔄 Creating v1 merged results from all v1 files...`);
        
        // Function to extract timestamp from filename (same as merge.ts)
        function extractTimestamp(filename: string): Date | null {
          const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)/);
          if (match && match[1]) {
            const isoTimestamp = match[1].replace(/T(\d{2})-(\d{2})-(\d{2})/, "T$1:$2:$3");
            return new Date(isoTimestamp);
          }
          return null;
        }

        const v1Dir = path.resolve(process.cwd(), "benchmarks", "v1");
        const v1Files = await fs.readdir(v1Dir);
        
        // Get all JSON files (exclude already merged ones)
        const v1JsonFiles = v1Files
          .filter((file) => 
            file.endsWith(".json") &&
            file.includes("benchmark-results") &&
            !file.includes("with-context") &&
            !file.includes("merged")
          )
          .map((file) => path.join(v1Dir, file));

        if (v1JsonFiles.length > 0) {
          console.log(`🔍 Found ${v1JsonFiles.length} v1 benchmark files to merge`);
          
          // Use the same merging logic as the main merge script
          const latestFiles = new Map<string, { filePath: string; timestamp: Date; results: HumanEvalResult[] }>();

          for (const filePath of v1JsonFiles) {
            const filename = path.basename(filePath);
            const timestamp = extractTimestamp(filename);

            if (!timestamp) {
              console.warn(`⚠️ Skipping file with unparseable timestamp: ${filename}`);
              continue;
            }

            const results = await loadBenchmarkData(filePath);
            
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

          // Merge all results
          const mergedResults: HumanEvalResult[] = [];
          const includedFiles = new Set<string>();

          for (const [key, info] of latestFiles.entries()) {
            console.log(`📊 Including v1 results for ${key} from ${path.basename(info.filePath)}`);
            mergedResults.push(...info.results);
            includedFiles.add(info.filePath);
          }

          // Save merged JSON
          const v1MergedJsonPath = path.resolve(v1Dir, "v1-benchmark-results-merged.json");
          await fs.writeFile(v1MergedJsonPath, JSON.stringify(mergedResults, null, 2));
          
          // Generate HTML
          const v1Html = await generateV1BenchmarkHTML(mergedResults, "v1-benchmark-results-merged.json");
          const v1HtmlFilePath = path.resolve(v1Dir, "v1-benchmark-results-merged.html");
          await fs.writeFile(v1HtmlFilePath, v1Html);

          console.log(`✅ Successfully merged v1 results from ${includedFiles.size} files`);
          console.log(`✅ Total provider/model combinations: ${latestFiles.size}`);
          console.log(`✅ Total result entries: ${mergedResults.length}`);
          console.log(`📝 Created v1/v1-benchmark-results-merged.html`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not process v1 results: ${error}`);
      }
    }

    console.log("✅ Static HTML build complete!");
  } catch (error) {
    console.error("Error building static HTML:", error);
    process.exit(1);
  }
}

// Run the build
buildStaticFiles();
