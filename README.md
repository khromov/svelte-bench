# SvelteBench

An LLM benchmark for Svelte 5 based on the HumanEval methodology from OpenAI's paper "Evaluating Large Language Models Trained on Code". This benchmark evaluates LLMs' ability to generate functional Svelte 5 components with proper use of runes and modern Svelte features.

## Overview

SvelteBench evaluates LLM-generated Svelte components by testing them against predefined test suites. It works by sending prompts to LLMs, generating Svelte components, and verifying their functionality through automated tests. The benchmark calculates pass@k metrics (typically pass@1 and pass@10) to measure model performance.

## Supported Providers

SvelteBench supports multiple LLM providers:

- **OpenAI** - GPT-4, GPT-4o, o1, o3, o4 models
- **Anthropic** - Claude 3.5, Claude 4 models
- **Google** - Gemini 2.5 models
- **OpenRouter** - Access to 100+ models through a unified API
- **Ollama** - Run models locally (Llama, Mistral, etc.)
- **Z.ai** - GLM-4 and other models

## Setup

```bash
nvm use
pnpm install

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
OPENROUTER_PROVIDER=deepseek  # Optional - preferred provider routing

# Ollama (optional - defaults to http://127.0.0.1:11434)
OLLAMA_HOST=http://127.0.0.1:11434

# Z.ai (optional)
Z_AI_API_KEY=your_z_ai_api_key_here
```

You only need to configure the providers you want to test with.

## Running the Benchmark

### Standard Execution

```bash
# Run the full benchmark (sequential execution)
pnpm start

# Run with parallel sample generation (faster)
PARALLEL_EXECUTION=true pnpm start

# Run tests only (without building visualization)
pnpm run run-tests
```

**NOTE: This will run all providers and models that are available!**

### Execution Modes

SvelteBench supports two execution modes:

- **Sequential (default)**: Tests and samples run one at a time. More reliable with detailed progress output.
- **Parallel**: Tests run sequentially, but samples within each test are generated in parallel. Faster execution with `PARALLEL_EXECUTION=true`.

### Debug Mode

For faster development, or to run just one provider/model, you can enable debug mode in your `.env` file:

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
pnpm run run-tests -- --context ./context/svelte.dev/llms-small.txt && pnpm run build
```

The context file will be included in the prompt to the LLM, providing additional information for generating components.

## Visualizing Results

After running the benchmark, you can visualize the results using the built-in visualization tool:

```bash
pnpm run build
```

You can now find the visualization in the `dist` directory.

## Adding New Tests

To add a new test:

1. Create a new directory in `src/tests/` with the name of your test
2. Add a `prompt.md` file with instructions for the LLM
3. Add a `test.ts` file with Vitest tests for the generated component
4. Add a `Reference.svelte` file with a reference implementation for validation

Example structure:

```
src/tests/your-test/
├── prompt.md        # Instructions for the LLM
├── test.ts          # Tests for the generated component
└── Reference.svelte # Reference implementation
```

## Benchmark Results

### Output Files

After running the benchmark, results are saved in multiple formats:

- **JSON Results**: `benchmarks/benchmark-results-{timestamp}.json` - Machine-readable results with pass@k metrics
- **HTML Visualization**: `benchmarks/benchmark-results-{timestamp}.html` - Interactive visualization of results
- **Individual Model Results**: `benchmarks/benchmark-results-{provider}-{model}-{timestamp}.json` - Per-model results

When running with a context file, the results filename will include "with-context" in the name.

### Versioning System

**Current Results**: All new benchmark runs produce current results with:
- Fixed test prompts and improved error handling
- Corrected Svelte syntax examples
- Standard naming without version suffixes

**Legacy Results (v1)**: Historical results from the original test suite with known issues in the "inspect" test prompt (stored in `benchmarks/v1/`).

### Merging Results

You can merge multiple benchmark results into a single file:

```bash
# Merge current results (recommended)
pnpm run merge

# Merge legacy results (if needed)
pnpm run merge-v1

# Build visualization from current results
pnpm run build

# Build visualization from legacy results
pnpm run build-v1
```

This creates merged JSON and HTML files:
- `pnpm run merge` → `benchmarks/benchmark-results-merged.{json,html}` (current results)
- `pnpm run merge-v1` → `benchmarks/v1/benchmark-results-merged.{json,html}` (legacy results)

The standard build process uses current results by default.

## Advanced Features

### Checkpoint & Resume

SvelteBench automatically saves checkpoints at the sample level, allowing you to resume interrupted benchmark runs:

- Checkpoints are saved in `tmp/checkpoint/` after each sample completion
- If a run is interrupted, it will automatically resume from the last checkpoint
- Checkpoints are cleaned up after successful completion

### Retry Mechanism

API calls have configurable retry logic with exponential backoff. Configure in `.env`:

```bash
RETRY_MAX_ATTEMPTS=3          # Maximum retry attempts (default: 3)
RETRY_INITIAL_DELAY_MS=1000   # Initial delay before retry (default: 1000ms)
RETRY_MAX_DELAY_MS=30000      # Maximum delay between retries (default: 30s)
RETRY_BACKOFF_FACTOR=2        # Exponential backoff factor (default: 2)
```

### Model Validation

Before running benchmarks, models are automatically validated to ensure they're available and properly configured. Invalid models are skipped with appropriate warnings.

### HumanEval Metrics

The benchmark calculates pass@k metrics based on the HumanEval methodology:

- **pass@1**: Probability that a single sample passes all tests
- **pass@10**: Probability that at least one of 10 samples passes all tests
- Default: 10 samples per test (1 sample for expensive models)

### Test Verification

Verify that all tests have proper structure:

```bash
pnpm run verify
```

This checks that each test has required files (prompt.md, test.ts, Reference.svelte).

## Current Test Suite

The benchmark includes tests for core Svelte 5 features:

- **hello-world**: Basic component rendering
- **counter**: State management with `$state` rune
- **derived**: Computed values with `$derived` rune
- **derived-by**: Advanced derived state with `$derived.by`
- **effect**: Side effects with `$effect` rune
- **props**: Component props with `$props` rune
- **each**: List rendering with `{#each}` blocks
- **snippets**: Reusable template snippets
- **inspect**: Debug utilities with `$inspect` rune

## Troubleshooting

### Common Issues

1. **Models not found**: Ensure API keys are correctly set in `.env`
2. **Tests failing**: Check that you're using Node.js 20+ and have run `pnpm install`
3. **Parallel execution errors**: Try sequential mode (remove `PARALLEL_EXECUTION=true`)
4. **Memory issues**: Reduce the number of samples or run in debug mode with fewer models

### Debugging

Enable detailed logging by examining the generated components in `tmp/samples/` directories and test outputs in the console.

## Contributing

Contributions are welcome! Please ensure:

1. New tests include all required files (prompt.md, test.ts, Reference.svelte)
2. Tests follow the existing structure and naming conventions
3. Reference implementations are correct and pass all tests
4. Documentation is updated for new features

## License

MIT
