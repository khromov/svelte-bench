import { JSDOM } from "jsdom";
import { compile } from "svelte/compiler";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import * as path from "path";
import { fireEvent } from "@testing-library/dom";
import { Script, createContext } from "vm";

// Setup a DOM environment for our tests
const setupDOM = () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
    pretendToBeVisual: true,
  });

  // Set up globals that would normally be provided by the browser
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  global.CustomEvent = dom.window.CustomEvent;

  // Set up other browser globals that Svelte needs
  global.location = dom.window.location;
  global.getComputedStyle = dom.window.getComputedStyle;
  global.Element = dom.window.Element;

  return dom;
};

// Create temp directory for compiled components
const tempDir = path.resolve("./temp_compiled_components");
if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

// Compile a Svelte component
const compileSvelteComponent = (filePath) => {
  try {
    const source = readFileSync(filePath, "utf-8");
    const fileName = path.basename(filePath, ".svelte");

    // Compile the component
    const result = compile(source, {
      filename: fileName,
      name: fileName,
      generate: "client",
      dev: true,
      runes: true,
    });

    // Output the compiled code to a file for inspection
    const tempFile = path.join(tempDir, `${fileName}.js`);
    writeFileSync(tempFile, result.js.code);

    // Log the first few lines of the compiled code for debugging
    console.log("\nCompiled component (first 3 lines):");
    console.log(result.js.code.split("\n").slice(0, 3).join("\n") + "...\n");

    return {
      code: result.js.code,
      filePath: tempFile,
    };
  } catch (err) {
    console.error(`Failed to compile Svelte component: ${filePath}`);
    console.error(err);
    throw err;
  }
};

// Custom render function for Svelte components
const render = (componentPath, props = {}) => {
  // Setup a fresh DOM for each test
  const dom = setupDOM();

  // Compile the component
  const { code, filePath } = compileSvelteComponent(componentPath);

  // Create a context with necessary globals
  const context = {
    ...global,
    window: global.window,
    document: global.document,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };

  // Execute the compiled code to get the component constructor
  let Component;
  try {
    // Execute the code in a VM context
    const script = new Script(`
      ${code}
      
      // Extract the component constructor
      Component = typeof module !== 'undefined' ? module.exports.default : null;
    `);

    const vmContext = createContext(context);
    script.runInContext(vmContext);

    // Get the component constructor from the context
    Component = vmContext.Component;

    if (!Component) {
      // Try to find the component by examining the code
      // Most Svelte compiled output follows a pattern like: function Component(...)
      const match = code.match(/function\s+([A-Za-z0-9_$]+)\s*\(options\)/);
      if (match && match[1]) {
        const componentName = match[1];

        // Re-run with the extracted component name
        const componentExtractScript = new Script(`
          ${code}
          
          // Extract the component constructor by name
          Component = typeof ${componentName} !== 'undefined' ? ${componentName} : null;
        `);

        componentExtractScript.runInContext(vmContext);
        Component = vmContext.Component;
      }
    }

    if (!Component) {
      throw new Error(
        `Could not extract component constructor from compiled code. Check ${filePath} for details.`
      );
    }
  } catch (err) {
    console.error("Error executing compiled component code:", err);
    throw err;
  }

  // Create a target element in the DOM
  const target = document.createElement("div");
  document.body.appendChild(target);

  // Instantiate the component
  const component = new Component({
    target,
    props,
  });

  // Helper to get elements by text content
  const getByText = (text) => {
    const elements = [...document.querySelectorAll("*")].filter(
      (el) => el.textContent === text
    );

    if (elements.length === 0) {
      throw new Error(`Could not find element with text: ${text}`);
    }

    return elements[0];
  };

  return {
    component,
    getByText,
    // Method to cleanup the component
    unmount: () => {
      component.$destroy();
      target.remove();
    },
  };
};

// Simple assertion functions
export const assertEquals = (actual, expected, message = "") => {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`);
  }
  return true;
};

export const assertExists = (element, message = "") => {
  if (!element) {
    throw new Error(`${message} Element should exist but was not found`);
  }
  return true;
};

// Helper to run tests and report results
const runTest = async (name, testFn) => {
  try {
    await testFn();
    console.log(`✅ PASS: ${name}`);
    return { name, passed: true };
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    return { name, passed: false, error: err.message };
  }
};

// Export a function to dynamically run tests
export async function runTests(tests) {
  console.log("Running tests...");
  const results = [];

  for (const { name, test } of tests) {
    results.push(await runTest(name, test));
  }

  // Summary
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;

  console.log("\nTest Results:");
  console.log(`Passed: ${passedTests}/${totalTests}`);

  return {
    passed: passedTests === totalTests,
    totalTests,
    passedTests,
    results,
  };
}

export { render, fireEvent };
