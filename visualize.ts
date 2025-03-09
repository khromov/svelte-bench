import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { ensureBenchmarksDir } from "./src/utils/test-manager";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Set up Express to use EJS and serve static files
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/benchmarks", express.static(path.join(__dirname, "benchmarks")));
app.use(express.static(path.join(__dirname, "public")));

/**
 * Load all benchmark results from the benchmarks directory
 */
async function loadBenchmarkFiles() {
  await ensureBenchmarksDir();

  const benchmarksDir = path.resolve(process.cwd(), "benchmarks");
  const files = await fs.readdir(benchmarksDir);

  // Filter only JSON files
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  // Sort files by modification date (newest first)
  const sortedFiles = await Promise.all(
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

  sortedFiles.sort((a, b) => b.mtime - a.mtime);

  // Return the sorted file paths and names
  return sortedFiles.map((file) => ({
    path: file.path,
    name: file.name,
  }));
}

/**
 * Load a benchmark file
 */
async function loadBenchmarkData(filePath: string) {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading benchmark file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Group benchmark results by provider and model
 */
function groupBenchmarkResults(results: any[]) {
  // Group by provider
  const byProvider: Record<string, any[]> = {};

  results.forEach((result) => {
    if (!byProvider[result.llmProvider]) {
      byProvider[result.llmProvider] = [];
    }
    byProvider[result.llmProvider].push(result);
  });

  // Sort providers alphabetically
  const sortedProviders = Object.keys(byProvider).sort((a, b) =>
    a.localeCompare(b)
  );

  // Build the final structure
  const groupedResults = [];

  for (const provider of sortedProviders) {
    const providerData = {
      provider,
      models: {} as Record<string, any[]>,
    };

    // Group by model
    byProvider[provider].forEach((result) => {
      if (!providerData.models[result.modelIdentifier]) {
        providerData.models[result.modelIdentifier] = [];
      }
      providerData.models[result.modelIdentifier].push(result);
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

// Create directories if they don't exist
async function ensureDirectories() {
  const dirs = [
    path.join(__dirname, "views"),
    path.join(__dirname, "public"),
    path.join(__dirname, "public", "js"),
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
}

// Initialize the necessary directories and files
async function initialize() {
  await ensureBenchmarksDir();
  await ensureDirectories();
}

// Set up the routes
app.get("/", async (req, res) => {
  try {
    // Get all benchmark files
    const benchmarkFiles = await loadBenchmarkFiles();

    if (benchmarkFiles.length === 0) {
      return res.render("index", {
        benchmarkFiles: [],
        selectedFile: null,
        groupedResults: [],
        benchmarkDataB64: "",
      });
    }

    // Get the selected file from query parameter or use the first file
    const selectedFile = req.query.file
      ? String(req.query.file)
      : benchmarkFiles[0].name;
    const selectedFilePath =
      benchmarkFiles.find((f) => f.name === selectedFile)?.path ||
      benchmarkFiles[0].path;

    // Load the benchmark data
    const benchmarkData = await loadBenchmarkData(selectedFilePath);

    // Group the results
    const groupedResults = groupBenchmarkResults(benchmarkData);

    // Convert the data to base64
    const benchmarkDataB64 = Buffer.from(
      JSON.stringify(groupedResults)
    ).toString("base64");

    // Render the template
    res.render("index", {
      benchmarkFiles,
      selectedFile,
      groupedResults,
      benchmarkDataB64,
    });
  } catch (error) {
    console.error("Error rendering visualization:", error);
    res.status(500).send("Error rendering visualization");
  }
});

// Start the server
async function startServer() {
  try {
    await initialize();
    app.listen(PORT, () => {
      console.log(
        `🚀 Visualization server running at http://localhost:${PORT}`
      );
      console.log(`🔍 Open your browser to view benchmark results`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

startServer();
