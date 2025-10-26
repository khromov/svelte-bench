# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SvelteBench is an LLM benchmark tool for Svelte 5 components based on the HumanEval methodology. It evaluates LLM-generated Svelte components by testing them against predefined test suites and calculates pass@k metrics.

**Core Architecture:**
- `index.ts` - Main benchmark orchestrator that manages the full test cycle
- `src/llms/` - Provider abstraction layer supporting OpenAI, Anthropic, Google, and OpenRouter
- `src/tests/` - Test definitions with `prompt.md` and `test.ts` pairs
- `src/utils/test-manager.ts` - Sequential HumanEval test execution logic (default)
- `src/utils/parallel-test-manager.ts` - Parallel HumanEval test execution logic (optional)
- `src/utils/test-runner.ts` - Vitest integration for component testing
- `tmp/` - Runtime directory for generated components (unique subdirs per test/sample)

## Execution Modes

SvelteBench supports two execution modes:

- **Sequential (default)**: Tests run one at a time, with samples generated sequentially. Full sample-level checkpointing and resumption support. Provides detailed progress output and is more reliable for long-running benchmarks.
- **Parallel**: Tests run one at a time, but samples within each test are generated in parallel for faster execution. Full sample-level checkpointing and resumption support with optimized output formatting. Set `PARALLEL_EXECUTION=true` to enable.

## Common Commands

### New AI SDK CLI Interface

```bash
# Basic syntax: pnpm start [provider:model] [options]

# Run with Anthropic Claude Haiku
pnpm start anthropic:claude-3-haiku

# Run with Anthropic Claude Haiku and MCP tools (Svelte-specific enhancements)
pnpm start anthropic:claude-3-haiku --mcp

# Run with OpenAI GPT-4o and parallel execution
pnpm start openai:gpt-4o --parallel

# Run with Google Gemini Flash, MCP tools, and parallel execution
pnpm start google:gemini-2.5-flash --mcp --parallel

# Run with context file and MCP (short flags)
pnpm start moonshot:kimi-k2 -m -c ./context/svelte.dev/llms-small.txt

# Show help
pnpm start --help
```

### Legacy Environment Variable Interface (Still Supported)

```bash
# Run full benchmark (sequential execution)
pnpm start

# Run with parallel execution (faster but more verbose)
PARALLEL_EXECUTION=true pnpm start

# Run only tests (without building visualization)
pnpm run run-tests

# Run with context file (Svelte docs)
pnpm run run-tests -- --context ./context/svelte.dev/llms-small.txt

# Run with both parallel execution and context
PARALLEL_EXECUTION=true pnpm run run-tests -- --context ./context/svelte.dev/llms-small.txt

# Run specific test with vitest
pnpm test

# Build visualization from results
pnpm run build

# Verify benchmark results
pnpm run verify
```

## Environment Variables

Set environment variables to control execution behavior:

```bash
# Debug mode for faster development testing (legacy, still supported)
DEBUG_MODE=true
DEBUG_PROVIDER=openrouter
DEBUG_MODEL=openai/gpt-oss-20b:free

# Enable parallel execution for faster benchmark runs (works with both CLI and DEBUG_MODE)
PARALLEL_EXECUTION=true
```

Multiple models can be specified: `DEBUG_MODEL=model1,model2,model3`

### AI SDK Providers Configuration

All AI SDK providers are now available through a unified interface. Configure API keys in `.env`:

**Language Model Providers:**
- `ANTHROPIC_API_KEY` - Anthropic Claude models
- `OPENAI_API_KEY` - OpenAI GPT models
- `GOOGLE_API_KEY` - Google Generative AI
- `GOOGLE_VERTEX_PROJECT` - Google Vertex AI
- `AZURE_API_KEY` + `AZURE_RESOURCE_NAME` - Azure OpenAI
- `XAI_API_KEY` - xAI Grok models
- `MISTRAL_API_KEY` - Mistral AI
- `GROQ_API_KEY` - Groq
- `DEEPSEEK_API_KEY` - DeepSeek
- `CEREBRAS_API_KEY` - Cerebras
- `FIREWORKS_API_KEY` - Fireworks
- `TOGETHER_API_KEY` - Together.ai
- `PERPLEXITY_API_KEY` - Perplexity
- `DEEPINFRA_API_KEY` - DeepInfra
- `COHERE_API_KEY` - Cohere
- `AWS_ACCESS_KEY_ID` + `AWS_REGION` - Amazon Bedrock

### MCP Integration

Enable Svelte-specific tooling through Model Context Protocol:
- `pnpm start anthropic:claude-3-haiku --mcp` - Enables MCP tools from https://mcp.svelte.dev/mcp
- MCP tools are loaded via HTTP transport for enhanced Svelte development capabilities

## Test Structure

Each test in `src/tests/` requires:
- `prompt.md` - Instructions for the LLM to generate a Svelte component
- `test.ts` - Vitest tests that validate the generated component functionality
- `Reference.svelte` - Reference implementation for validation

The benchmark generates components in `tmp/{provider}/` directories and runs tests using the integrated Vitest setup.

## Versioning System

**Current Results:** Results generated with fixed test prompts and improved error handling. All new benchmark runs produce results with:
- Fixed quotation mark issues in test prompts that were causing model confusion
- Corrected Svelte binding syntax examples (e.g., `bind:value={text}` instead of `bind:value="{text}"`)
- Improved test reliability and accuracy
- Clean filenames without version suffixes (e.g., `benchmark-results-2025-08-27T12-34-56.789Z.json`)

**Legacy Results:** Historical results from original test suite in the `benchmarks/v1/` directory. These may contain inconsistencies due to prompt formatting issues.

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
