# SvelteBench

An LLM benchmark for Svelte 5 based on the HumanEval methodology.

## Overview

SvelteBench evaluates LLM-generated Svelte components by testing them against predefined test suites. It works by sending prompts to LLMs, generating Svelte components, and verifying their functionality through automated tests.

## Setup

```bash
# Install dependencies
npm install

# Or if using bun
bun install

# Create .env file from example
cp .env.example .env
```

Then edit the `.env` file and add your API keys:

```
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

## Running the Benchmark

```bash
# Run the benchmark with settings from .env file
npm start

# Or override settings from command line
LLM_PROVIDER=openai OPENAI_API_KEY=your_api_key_here npm start

# Using Anthropic provider
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=your_api_key_here npm start
```

## Visualizing Results

After running the benchmark, you can visualize the results using the built-in visualization tool:

```bash
npm run visualize
```

This will start a local web server at http://localhost:3000 where you can:

- Select from different benchmark runs
- View test results
- Examine the generated code for each test
- See details about test success/failure

## Directory Structure

- `src/llms/`: LLM provider integrations
- `src/tests/`: Test specifications (prompts and tests)
- `src/utils/`: Utility functions for file operations and test running
- `tmp/`: Temporary directory for generated files (cleaned before and after tests)
- `benchmarks/`: Directory for storing benchmark results

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

## Environment Variables

SvelteBench uses the following environment variables, which can be set in the `.env` file:

- `LLM_PROVIDER`: The LLM provider to use ('openai' or 'anthropic')
- `OPENAI_API_KEY`: Your OpenAI API key (required for using the OpenAI provider)
- `OPENAI_MODEL`: OpenAI model to use (optional, defaults to 'gpt-4o')
- `ANTHROPIC_API_KEY`: Your Anthropic API key (required for using the Anthropic provider)
- `ANTHROPIC_MODEL`: Anthropic model to use (optional, defaults to 'claude-3-sonnet-20240229')

## Requirements

- Node.js v23 (specified in .nvmrc)
- TypeScript 5+ (peer dependency)
- OpenAI API key (for using the OpenAI provider)
- Anthropic API key (for using the Anthropic provider)

## Benchmark Results

After running the benchmark, results are saved to a JSON file in the `benchmarks` directory. The file is named `benchmark-results-{timestamp}.json`.
