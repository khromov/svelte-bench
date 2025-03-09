// Function to escape HTML for safe display
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Function to show code modal
function showCodeModal(provider, model, resultIndex) {
  const codeModal = document.getElementById("code-modal");
  const codeDisplay = document.getElementById("code-display");
  const modalTitle = document.getElementById("modal-title");

  // Find the result in the benchmark data
  let result = null;
  for (const providerData of window.benchmarkData) {
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
    console.error("Result not found");
    return;
  }

  // Set the title and code content
  modalTitle.textContent = `${result.testName} (${
    result.testResult.success ? "PASS" : "FAIL"
  }) - ${result.llmProvider} ${result.modelIdentifier}`;

  // Format the code with syntax highlighting
  codeDisplay.innerHTML = `<pre><code class="language-svelte">${escapeHtml(
    result.generatedCode
  )}</code></pre>`;

  // Add test results details
  const testDetails = document.createElement("div");
  testDetails.className = "test-details";

  // Create errors section if there are errors
  let errorsHtml = "";
  if (result.testResult.errors && result.testResult.errors.length > 0) {
    errorsHtml = `
      <div class="errors-section">
        <h4>Errors (${result.testResult.errors.length})</h4>
        <div class="error-list">
          ${result.testResult.errors
            .map(
              (error) =>
                `<div class="error-item">
              <pre>${escapeHtml(error)}</pre>
            </div>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  testDetails.innerHTML = `
    <h3>Test Results</h3>
    <p>LLM Provider: ${result.llmProvider || "N/A"}</p>
    <p>Model: ${result.modelIdentifier || "N/A"}</p>
    ${errorsHtml}
    <p>Total Tests: ${result.testResult.totalTests}</p>
    <p>Passed: ${
      result.testResult.totalTests - result.testResult.failedTests
    }</p>
    <p>Failed: ${result.testResult.failedTests}</p>
    <p>Generated at: ${new Date(result.timestamp).toLocaleString()}</p>
  `;
  codeDisplay.appendChild(testDetails);

  // Show the modal
  codeModal.style.display = "block";
}

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  // Close modal when clicking the close button
  const closeButton = document.getElementById("close-modal");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      const codeModal = document.getElementById("code-modal");
      codeModal.style.display = "none";
    });
  }

  // Close modal when clicking outside the modal content
  const codeModal = document.getElementById("code-modal");
  if (codeModal) {
    codeModal.addEventListener("click", (event) => {
      if (event.target === codeModal) {
        codeModal.style.display = "none";
      }
    });
  }
});
