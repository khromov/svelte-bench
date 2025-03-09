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

Then edit the `.env` file and add your OpenAI API key:

```
OPENAI_API_KEY=your_api_key_here
```

## Running the Benchmark

```bash
# Run the benchmark with settings from .env file
npm start

# Or override settings from command line
LLM_PROVIDER=openai OPENAI_API_KEY=your_api_key_here npm start
```

## Directory Structure

- `src/llms/`: LLM provider integrations
- `src/tests/`: Test specifications (prompts and tests)
- `src/utils/`: Utility functions for file operations and test running
- `tmp/`: Temporary directory for generated files (cleaned before and after tests)

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

- `LLM_PROVIDER`: The LLM provider to use (currently only supports 'openai')
- `OPENAI_API_KEY`: Your OpenAI API key (required for using the OpenAI provider)
- `OPENAI_MODEL`: OpenAI model to use (optional, defaults to 'gpt-4')

## Requirements

- Node.js v23 (specified in .nvmrc)
- TypeScript 5+ (peer dependency)
- OpenAI API key (for using the OpenAI provider)

## Benchmark Results

After running the benchmark, results are saved to a JSON file in the project root directory. The file is named `benchmark-results-{timestamp}.json`.
