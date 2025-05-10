# SvelteBench

An LLM benchmark for Svelte 5 based on the OpenAI methodology from OpenAIs paper "Evaluating Large Language Models Trained on Code", using a similar structure to the HumanEval dataset.

**Work in progress**

## Overview

SvelteBench evaluates LLM-generated Svelte components by testing them against predefined test suites. It works by sending prompts to LLMs, generating Svelte components, and verifying their functionality through automated tests.

## Setup

```bash
nvm use
npm install

# Create .env file from example
cp .env.example .env
```

Then edit the `.env` file and add your API keys.

## Running the Benchmark

```bash
# Run the benchmark with settings from .env file
npm start
```

### Debug Mode

For faster development, you can enable debug mode in your `.env` file:

```
DEBUG_MODE=true
DEBUG_PROVIDER=anthropic
DEBUG_MODEL=claude-3-7-sonnet-20250219
DEBUG_TEST=counter
```

Debug mode runs only one provider/model combination, making it much faster for testing during development.

### Running with Context

You can provide a context file (like Svelte documentation) to help the LLM generate better components:

```bash
# Run with a context file
npm run run-tests -- --context ./context/svelte.dev/llms-small.txt && npm run build
```

The context file will be included in the prompt to the LLM, providing additional information for generating components.

## Visualizing Results

After running the benchmark, you can visualize the results using the built-in visualization tool:

```bash
npm run build
```

You can now find the visualization in the `dist` directory.

## Adding New Tests

To add a new test:

1. Create a new directory in `src/tests/` with the name of your test
2. Add a `prompt.md` file with instructions for the LLM
3. Add a `test.ts` file with Vitest tests for the generated component

Example structure:

```
src/tests/your-test/
├── prompt.md    # Instructions for the LLM
└── test.ts      # Tests for the generated component
```

## Benchmark Results

After running the benchmark, results are saved to a JSON file in the `benchmarks` directory. The file is named `benchmark-results-{timestamp}.json`.

When running with a context file, the results filename will include "with-context" in the name: `benchmark-results-with-context-{timestamp}.json`.
