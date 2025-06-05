# SvelteBench

An LLM benchmark for Svelte 5 based on the OpenAI methodology from OpenAIs paper "Evaluating Large Language Models Trained on Code", using a similar structure to the HumanEval dataset.

**Work in progress**

## Overview

SvelteBench evaluates LLM-generated Svelte components by testing them against predefined test suites. It works by sending prompts to LLMs, generating Svelte components, and verifying their functionality through automated tests.

## Supported Providers

SvelteBench supports multiple LLM providers:

- **OpenAI** - GPT-4, GPT-4o, o1, o3, o4 models
- **Anthropic** - Claude 3.5, Claude 4 models
- **Google** - Gemini 2.5 models
- **OpenRouter** - Access to multiple providers through a single API

## Setup

```bash
nvm use
npm install

# Create .env file from example
cp .env.example .env
```

Then edit the `.env` file and add your API keys:

```bash
# OpenAI (optional)
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google Gemini (optional)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenRouter (optional)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_SITE_URL=https://github.com/khromov/svelte-bench  # Optional
OPENROUTER_SITE_NAME=SvelteBench  # Optional
```

You only need to configure the providers you want to test with.

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

#### Running Multiple Models in Debug Mode

You can now specify multiple models to test in debug mode by providing a comma-separated list:

```
DEBUG_MODE=true
DEBUG_PROVIDER=anthropic
DEBUG_MODEL=claude-3-7-sonnet-20250219,claude-opus-4-20250514,claude-sonnet-4-20250514
```

This will run tests with all three models sequentially while still staying within the same provider.

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
