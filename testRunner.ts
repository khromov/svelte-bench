import { JSDOM } from "jsdom";
import { render as svelteTLRender, fireEvent } from "@testing-library/svelte";

// Setup a minimal browser-like environment
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

  // Required for some DOM testing library methods
  global.Element = dom.window.Element;
  global.HTMLElement = dom.window.HTMLElement;
  global.getComputedStyle = dom.window.getComputedStyle;
};

// Wrap the render function to always return useful queries
const render = (Component, options = {}) => {
  const result = svelteTLRender(Component, options);

  return {
    ...result,
    getByText: (text) => {
      const element = result.getByText(text);
      if (!element) throw new Error(`Element with text "${text}" not found`);
      return element;
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
