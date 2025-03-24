# SvelteBench

An LLM benchmark for Svelte 5 based on the HumanEval methodology.

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

Then edit the `.env` file and add your API keys:

```
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Running the Benchmark

```bash
# Run the benchmark with settings from .env file
npm start
```

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
