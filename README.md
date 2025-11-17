# SvelteBench

An LLM benchmark for Svelte 5 based on HumanEval methodology. Evaluates LLM-generated Svelte components through automated tests and calculates pass@k metrics.

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env and add your API keys for providers you want to test
```

## Usage

### Basic Commands

```bash
# Run benchmark with specific model
pnpm start anthropic:claude-3-haiku

# Run with MCP tools (Svelte-specific enhancements)
pnpm start google:gemini-2.5-flash --mcp

# Run with parallel execution (faster)
pnpm start openai:gpt-4o --parallel

# Run with context file
pnpm start moonshot:kimi-k2 -m -c ./context/svelte.dev/llms-small.txt

# Show help
pnpm start --help
```

### Options

- `-h, --help` - Show help
- `-p, --parallel` - Parallel execution (faster)
- `-m, --mcp` - Enable MCP tools
- `-c, --context <file>` - Load context file

### Debug Mode (legacy)

Use `.env` for quick development testing:

```bash
DEBUG_MODE=true
DEBUG_PROVIDER=anthropic
DEBUG_MODEL=claude-4-5-haiku
DEBUG_TEST=counter  # Optional: specific test
```

Multiple models supported: `DEBUG_MODEL=model1,model2,model3`

### Environment Variables (legacy)

```bash
# Run all providers (legacy interface)
pnpm start

# Parallel execution (legacy)
PARALLEL_EXECUTION=true pnpm start
```

## Supported Providers

Via **Vercel AI SDK** unified interface:

- **Native SDK Providers**: OpenAI, Anthropic, Google Gemini, OpenRouter, Moonshot, Z.ai, Ollama
- **AI SDK Registry**: Azure OpenAI, xAI (Grok), Mistral, Groq, DeepSeek, Cerebras, Fireworks, Together.ai, Perplexity, DeepInfra, Cohere, Amazon Bedrock, and more

See `.env.example` for API key configuration.

## Results & Visualization

Results are automatically saved to `benchmarks/` with timestamps. Build visualization:

```bash
pnpm run build  # Creates merged visualization
```

Output files:
- `benchmark-results-{timestamp}.json` - Raw results with pass@k metrics
- `benchmark-results-merged.html` - Interactive visualization

## Test Suite

Tests for core Svelte 5 features:

- **hello-world** - Basic component rendering
- **counter** - State management (`$state`)
- **derived** - Computed values (`$derived`)
- **derived-by** - Advanced derived state (`$derived.by`)
- **effect** - Side effects (`$effect`)
- **props** - Component props (`$props`)
- **each** - List rendering (`{#each}`)
- **snippets** - Reusable templates
- **inspect** - Debug utilities (`$inspect`)

### Adding Tests

Create directory in `src/tests/` with:
- `prompt.md` - LLM instructions
- `test.ts` - Vitest tests
- `Reference.svelte` - Reference implementation

## Features

### Checkpoint & Resume
Automatic sample-level checkpointing in `tmp/checkpoint/` - interrupted runs resume automatically.

### HumanEval Metrics
- **pass@1** - Probability single sample passes
- **pass@10** - Probability ≥1 of 10 samples passes
- Default: 10 samples/test (1 for expensive models)

### Retry Logic
Configurable exponential backoff via `.env`:
```bash
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY_MS=1000
RETRY_MAX_DELAY_MS=30000
RETRY_BACKOFF_FACTOR=2
```

## Utility Commands

```bash
pnpm run verify      # Verify test structure
pnpm run merge       # Merge all results
pnpm run merge-v1    # Merge legacy results (legacy)
pnpm run build-v1    # Build legacy visualization (legacy)
```

## License

MIT
