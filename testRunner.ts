import { JSDOM } from "jsdom";
import { compile } from "svelte/compiler";
import { readFileSync } from "fs";
import path from "path";
import { fireEvent } from "@testing-library/dom";

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

  // Add all the window properties to the global namespace
  Object.defineProperties(global, {
    ...Object.getOwnPropertyDescriptors(dom.window),
    ...Object.getOwnPropertyDescriptors(global),
  });

  // Required for DOM methods
  global.Element = dom.window.Element;
  global.HTMLElement = dom.window.HTMLElement;
  global.getComputedStyle = dom.window.getComputedStyle;
};

// Compile a Svelte component
const compileSvelteComponent = (filePath) => {
  try {
    const source = readFileSync(filePath, "utf-8");

    const result = compile(source, {
      filename: path.basename(filePath),
      generate: "client",
      dev: true,
      runes: true, // Enable Svelte 5 runes
    });

    // Create a module from the compiled code
    const module = { exports: {} };
    const fn = new Function("module", "exports", result.js.code);
    fn(module, module.exports);

    return module.exports.default;
  } catch (err) {
    console.error(`Failed to compile Svelte component: ${filePath}`);
    console.error(err);
    throw err;
  }
};

// Custom render function for Svelte components
const render = (componentPath, props = {}) => {
  // Compile the component
  const Component = compileSvelteComponent(componentPath);

  // Create a target element
  const target = document.createElement("div");
  document.body.appendChild(target);

  // Instantiate the component
  const component = new Component({
    target,
    props,
  });

  // Helper to get elements by text content
  const getByText = (text) => {
    const element = [...document.querySelectorAll("*")].find(
      (el) => el.textContent === text
    );

    if (!element) {
      throw new Error(`Could not find element with text: ${text}`);
    }

    return element;
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
  // Setup DOM once
  setupDOM();

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
