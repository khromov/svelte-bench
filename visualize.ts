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

// Create the JavaScript file
async function createJsFile() {
  const jsFilePath = path.join(__dirname, "public", "js", "visualizer.js");

  try {
    // Check if file already exists
    await fs.access(jsFilePath);
    return; // File exists, no need to create it
  } catch (error) {
    // File doesn't exist, create it
    const jsContent = `// Function to escape HTML for safe display
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Function to decode base64 data
function decodeBase64Data() {
  const encodedData = document.getElementById('benchmark-data').getAttribute('data-json');
  if (!encodedData) {
    console.error('No encoded data found');
    return [];
  }
  
  try {
    const jsonString = atob(encodedData);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error decoding benchmark data:', error);
    return [];
  }
}

// Function to show code modal
function showCodeModal(provider, model, resultIndex) {
  const codeModal = document.getElementById('code-modal');
  const codeDisplay = document.getElementById('code-display');
  const modalTitle = document.getElementById('modal-title');
  
  // Get the benchmark data
  const benchmarkData = decodeBase64Data();
  
  // Find the result in the benchmark data
  let result = null;
  for (const providerData of benchmarkData) {
    if (providerData.provider === provider) {
      for (const [modelName, results] of Object.entries(providerData.models)) {
        if (modelName === model) {
          result = results[resultIndex];
          break;
        }
      }
      if (result) break;
    }
  }
  
  if (!result) {
    console.error('Result not found');
    return;
  }
  
  // Set the title and code content
  modalTitle.textContent = \`\${result.testName} (\${result.testResult.success ? 'PASS' : 'FAIL'}) - \${result.llmProvider} \${result.modelIdentifier}\`;
  
  // Format the code with syntax highlighting
  codeDisplay.innerHTML = \`<pre><code class="language-svelte">\${escapeHtml(result.generatedCode)}</code></pre>\`;
  
  // Add test results details
  const testDetails = document.createElement('div');
  testDetails.className = 'test-details';
  
  // Create errors section if there are errors
  let errorsHtml = '';
  if (result.testResult.errors && result.testResult.errors.length > 0) {
    errorsHtml = \`
      <div class="errors-section">
        <h4>Errors (\${result.testResult.errors.length})</h4>
        <div class="error-list">
          \${result.testResult.errors.map(error => 
            \`<div class="error-item">
              <pre>\${escapeHtml(error)}</pre>
            </div>\`
          ).join('')}
        </div>
      </div>
    \`;
  }
  
  testDetails.innerHTML = \`
    <h3>Test Results</h3>
    <p>LLM Provider: \${result.llmProvider || 'N/A'}</p>
    <p>Model: \${result.modelIdentifier || 'N/A'}</p>
    \${errorsHtml}
    <p>Total Tests: \${result.testResult.totalTests}</p>
    <p>Passed: \${result.testResult.totalTests - result.testResult.failedTests}</p>
    <p>Failed: \${result.testResult.failedTests}</p>
    <p>Generated at: \${new Date(result.timestamp).toLocaleString()}</p>
  \`;
  codeDisplay.appendChild(testDetails);
  
  // Show the modal
  codeModal.style.display = 'block';
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  // Close modal when clicking the close button
  const closeButton = document.getElementById('close-modal');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      const codeModal = document.getElementById('code-modal');
      codeModal.style.display = 'none';
    });
  }
  
  // Close modal when clicking outside the modal content
  const codeModal = document.getElementById('code-modal');
  if (codeModal) {
    codeModal.addEventListener('click', (event) => {
      if (event.target === codeModal) {
        codeModal.style.display = 'none';
      }
    });
  }
});`;

    await fs.writeFile(jsFilePath, jsContent);
    console.log(`Created JS file at ${jsFilePath}`);
  }
}

// Initialize the necessary directories and files
async function initialize() {
  await ensureBenchmarksDir();
  await ensureDirectories();
  await createJsFile();
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
