import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { ensureBenchmarksDir } from "./src/utils/test-manager";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

/**
 * Load all benchmark results from the benchmarks directory
 */
async function loadBenchmarkResults() {
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

  // Return the sorted file paths
  return sortedFiles.map((file) => file.path);
}

/**
 * Generate the HTML for the visualization
 */
async function generateVisualizationHtml() {
  const benchmarkFiles = await loadBenchmarkResults();

  if (benchmarkFiles.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SvelteBench Visualization</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.5;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
            }
            .error {
              color: #e53e3e;
              padding: 20px;
              background-color: #fff5f5;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h1>SvelteBench Visualization</h1>
          <div class="error">
            <h2>No benchmark results found</h2>
            <p>Run the benchmark first using <code>npm start</code></p>
          </div>
        </body>
      </html>
    `;
  }

  // Generate the JavaScript to load the benchmark files
  const jsToLoadBenchmarks = `
    const benchmarkFiles = ${JSON.stringify(
      benchmarkFiles.map((file) => path.basename(file))
    )};
    const benchmarksPath = '/benchmarks';
    
    // Function to fetch benchmark data
    async function fetchBenchmark(filename) {
      const response = await fetch(\`\${benchmarksPath}/\${filename}\`);
      if (!response.ok) {
        throw new Error(\`Failed to load benchmark: \${filename}\`);
      }
      return response.json();
    }
    
    // Function to render benchmark results
    function renderBenchmark(benchmark, container) {
      // Clear existing content
      container.innerHTML = '';
      
      // Create a table for the results
      const table = document.createElement('table');
      table.className = 'results-table';
      
      // Create header row
      const headerRow = document.createElement('tr');
      ['Test', 'Status', 'Tests Passed', 'Errors', 'View Code'].forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
      });
      table.appendChild(headerRow);
      
      // Create a row for each test
      benchmark.forEach(result => {
        const row = document.createElement('tr');
        
        // Test name
        const nameCell = document.createElement('td');
        nameCell.textContent = result.testName;
        row.appendChild(nameCell);
        
        // Status
        const statusCell = document.createElement('td');
        if (result.testResult.success) {
          statusCell.innerHTML = '<span class="success">✅ PASS</span>';
        } else {
          statusCell.innerHTML = '<span class="failure">❌ FAIL</span>';
        }
        row.appendChild(statusCell);
        
        // Tests passed
        const testsCell = document.createElement('td');
        testsCell.textContent = \`\${result.testResult.totalTests - result.testResult.failedTests}/\${result.testResult.totalTests}\`;
        row.appendChild(testsCell);
        
        // Errors count
        const errorsCell = document.createElement('td');
        const errorCount = result.testResult.errors ? result.testResult.errors.length : 0;
        if (errorCount > 0) {
          errorsCell.innerHTML = \`<span class="failure">\${errorCount}</span>\`;
        } else {
          errorsCell.textContent = '0';
        }
        row.appendChild(errorsCell);
        
        // View code button
        const codeCell = document.createElement('td');
        const codeButton = document.createElement('button');
        codeButton.textContent = 'View Code';
        codeButton.className = 'view-code-button';
        codeButton.onclick = () => {
          const codeModal = document.getElementById('code-modal');
          const codeDisplay = document.getElementById('code-display');
          const modalTitle = document.getElementById('modal-title');
          
          // Set the title and code content
          modalTitle.textContent = \`\${result.testName} (\${result.testResult.success ? 'PASS' : 'FAIL'})\`;
          
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
            \${errorsHtml}
            <p>Total Tests: \${result.testResult.totalTests}</p>
            <p>Passed: \${result.testResult.totalTests - result.testResult.failedTests}</p>
            <p>Failed: \${result.testResult.failedTests}</p>
            <p>Generated at: \${new Date(result.timestamp).toLocaleString()}</p>
          \`;
          codeDisplay.appendChild(testDetails);
          
          // Show the modal
          codeModal.style.display = 'block';
        };
        codeCell.appendChild(codeButton);
        row.appendChild(codeCell);
        
        table.appendChild(row);
      });
      
      container.appendChild(table);
    }
    
    // Function to escape HTML
    function escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
    
    // Function to load and render selected benchmark
    async function loadSelectedBenchmark() {
      const select = document.getElementById('benchmark-select');
      const filename = select.value;
      const resultsContainer = document.getElementById('results-container');
      
      try {
        const benchmark = await fetchBenchmark(filename);
        renderBenchmark(benchmark, resultsContainer);
      } catch (error) {
        console.error('Failed to load benchmark:', error);
        resultsContainer.innerHTML = \`<div class="error">Failed to load benchmark: \${error.message}</div>\`;
      }
    }
    
    // Initialize the page
    document.addEventListener('DOMContentLoaded', async () => {
      const select = document.getElementById('benchmark-select');
      
      // Populate the select with benchmark files
      benchmarkFiles.forEach(filename => {
        const option = document.createElement('option');
        option.value = filename;
        option.textContent = filename;
        select.appendChild(option);
      });
      
      // Load the first benchmark
      if (benchmarkFiles.length > 0) {
        await loadSelectedBenchmark();
      }
      
      // Add change event listener to select
      select.addEventListener('change', loadSelectedBenchmark);
      
      // Close modal when clicking the close button
      const closeButton = document.getElementById('close-modal');
      closeButton.addEventListener('click', () => {
        const codeModal = document.getElementById('code-modal');
        codeModal.style.display = 'none';
      });
      
      // Close modal when clicking outside the modal content
      const codeModal = document.getElementById('code-modal');
      codeModal.addEventListener('click', (event) => {
        if (event.target === codeModal) {
          codeModal.style.display = 'none';
        }
      });
    });
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SvelteBench Visualization</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          
          h1, h2, h3, h4 {
            margin-top: 0;
          }
          
          select {
            padding: 8px;
            margin-bottom: 20px;
            border-radius: 4px;
            border: 1px solid #ddd;
            font-size: 16px;
            width: 100%;
            max-width: 400px;
          }
          
          .results-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .results-table th, .results-table td {
            padding: 12px 15px;
            border: 1px solid #ddd;
            text-align: left;
          }
          
          .results-table th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          
          .results-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          
          .success {
            color: #2f855a;
            font-weight: bold;
          }
          
          .failure {
            color: #e53e3e;
            font-weight: bold;
          }
          
          .error {
            color: #e53e3e;
            padding: 15px;
            background-color: #fff5f5;
            border-radius: 5px;
            margin: 15px 0;
          }
          
          .errors-section {
            margin: 15px 0;
          }
          
          .error-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          
          .error-item {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            background-color: #fff5f5;
          }
          
          .error-item:last-child {
            border-bottom: none;
          }
          
          .error-item pre {
            margin: 0;
            white-space: pre-wrap;
            font-size: 14px;
          }
          
          .view-code-button {
            background-color: #4299e1;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          
          .view-code-button:hover {
            background-color: #3182ce;
          }
          
          /* Modal styles */
          .modal {
            display: none;
            position: fixed;
            z-index: 1;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.4);
          }
          
          .modal-content {
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 1000px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
          }
          
          .close:hover {
            color: black;
          }
          
          .code-container {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow: auto;
            margin-top: 15px;
          }
          
          .code-container pre {
            margin: 0;
            white-space: pre-wrap;
          }
          
          .test-details {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <h1>SvelteBench Visualization</h1>
        
        <div>
          <label for="benchmark-select">Select Benchmark:</label>
          <select id="benchmark-select"></select>
        </div>
        
        <div id="results-container"></div>
        
        <!-- Modal for code view -->
        <div id="code-modal" class="modal">
          <div class="modal-content">
            <span id="close-modal" class="close">&times;</span>
            <h2 id="modal-title"></h2>
            <div class="code-container" id="code-display"></div>
          </div>
        </div>
        
        <script>${jsToLoadBenchmarks}</script>
      </body>
    </html>
  `;
}

// Set up Express server
app.use("/benchmarks", express.static(path.join(__dirname, "benchmarks")));

app.get("/", async (req, res) => {
  try {
    const html = await generateVisualizationHtml();
    res.send(html);
  } catch (error) {
    console.error("Error generating visualization:", error);
    res.status(500).send("Error generating visualization");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Visualization server running at http://localhost:${PORT}`);
  console.log(`🔍 Open your browser to view benchmark results`);
});
