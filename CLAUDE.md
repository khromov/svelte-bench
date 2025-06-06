# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SvelteBench is an LLM benchmark tool for Svelte 5 components based on the HumanEval methodology. It evaluates LLM-generated Svelte components by testing them against predefined test suites and calculates pass@k metrics.

**Core Architecture:**
- `index.ts` - Main benchmark orchestrator that manages the full test cycle
- `src/llms/` - Provider abstraction layer supporting OpenAI, Anthropic, Google, and OpenRouter
- `src/tests/` - Test definitions with `prompt.md` and `test.ts` pairs
- `src/utils/test-manager.ts` - HumanEval test execution logic
- `src/utils/test-runner.ts` - Vitest integration for component testing
- `tmp/` - Runtime directory for generated components (provider-specific subdirs)

## Common Commands

```bash
# Run full benchmark
npm start

# Run only tests (without building visualization)
npm run run-tests

# Run with context file (Svelte docs)
npm run run-tests -- --context ./context/svelte.dev/llms-small.txt

# Run specific test with vitest
npm test

# Build visualization from results
npm run build

# Verify benchmark results
npm run verify
```

## Debug Mode

Set environment variables for faster development testing:

```bash
DEBUG_MODE=true
DEBUG_PROVIDER=anthropic
DEBUG_MODEL=claude-3-7-sonnet-20250219
DEBUG_TEST=counter
```

Multiple models can be specified: `DEBUG_MODEL=model1,model2,model3`

## Test Structure

Each test in `src/tests/` requires:
- `prompt.md` - Instructions for the LLM to generate a Svelte component
- `test.ts` - Vitest tests that validate the generated component functionality

The benchmark generates components in `tmp/{provider}/` directories and runs tests using the integrated Vitest setup.

## Environment Setup

Copy `.env.example` to `.env` and configure API keys for desired providers:
- `OPENAI_API_KEY` - For GPT models
- `ANTHROPIC_API_KEY` - For Claude models  
- `GEMINI_API_KEY` - For Gemini models
- `OPENROUTER_API_KEY` - For OpenRouter access

## Testing and Validation

- Tests use Vitest with @testing-library/svelte for component testing
- Each test runs with a 120-second timeout
- Pass@k metrics are calculated using HumanEval methodology (10 samples per test by default, 1 for expensive models)
- Results are saved to timestamped JSON files in `benchmarks/`