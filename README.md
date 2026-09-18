# SvelteBench

An LLM benchmark for Svelte 5 based on the HumanEval methodology from OpenAI's paper "Evaluating Large Language Models Trained on Code". This benchmark evaluates LLMs' ability to generate functional Svelte 5 components with proper use of runes and modern Svelte features.

## Overview

SvelteBench evaluates LLM-generated Svelte components by testing them against predefined test suites. It works by sending prompts to LLMs, generating Svelte components, and verifying their functionality through automated tests. The benchmark calculates pass@k metrics (typically pass@1 and pass@10) to measure model performance.

## Supported Providers

SvelteBench supports multiple LLM providers:

- **OpenAI**
- **Anthropic**
- **Google Gemini**
- **OpenRouter** - Access to models through a unified API
- **Fireworks** - Fireworks-hosted models through its OpenAI-compatible API
- **Ollama** - Run models locally
- **Z.ai**
- **Moonshot**
- **xAI**
- **Meta**
- **Cursor**
- **MiniMax** - MiniMax's OpenAI-compatible API

## Setup

```bash
nvm use
pnpm install
```

The recommended workflow is to choose a provider and configure its API key from
the TUI. Start it with:

```bash
pnpm tui
```

If the selected provider has no saved key, the TUI prompts for one and stores
it in `.env` for future runs. You only need to configure the providers you use.

For scripted or CI usage, create `.env` from the example and add your keys:

```bash
# Optional: create the env-compatible configuration file
cp .env.example .env

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

# Fireworks (optional)
FIREWORKS_API_KEY=your_fireworks_api_key_here

# Ollama (optional - defaults to http://127.0.0.1:11434)
OLLAMA_HOST=http://127.0.0.1:11434

# Z.ai (optional)
Z_AI_API_KEY=your_z_ai_api_key_here

# Moonshot (optional)
MOONSHOT_API_KEY=your_moonshot_api_key_here

# xAI (optional)
XAI_API_KEY=your_xai_api_key_here

# Meta (optional)
META_API_KEY=your_meta_api_key_here

# Cursor (optional)
CURSOR_API_KEY=your_cursor_api_key_here

# MiniMax (optional)
MINIMAX_API_KEY=your_minimax_api_key_here
```

The existing environment variables remain supported by `pnpm run-tests` and
the standard `pnpm start` command.

## Running the Benchmark

### TUI Execution

```bash
pnpm tui
```

The TUI guides you through:

1. Selecting a provider
2. Entering an API key if that provider has no saved key
3. Choosing parallel or sequential execution
4. Selecting a model
5. Running the benchmark with live progress
6. Reviewing the results

Use `←` to go back between setup and selection screens. Double-press `Esc`
within one second to exit, or use `Ctrl+C`.

### Environment-Compatible Execution

```bash
# Run the full benchmark and build the visualization
pnpm start

# Run with parallel sample generation (faster)
PARALLEL_EXECUTION=true pnpm start

# Run tests only (without building visualization)
pnpm run-tests
```

**NOTE: This will run all providers and models that are available!**

### Execution Modes

SvelteBench supports three execution modes:

- **Sequential (default)**: Tests and samples run one at a time. More reliable with detailed progress output.
- **Parallel**: Tests run sequentially, but samples within each test are generated in parallel. Faster execution with `PARALLEL_EXECUTION=true`.
- **MADMAX**: All test categories run concurrently, while samples inside every category also run concurrently. This is the fastest and most rate-limit-sensitive mode; enable it with `MADMAX_EXECUTION=true`.

### Debug Mode (Environment-Compatible)

For faster development, or to run just one provider/model, you can enable debug mode in your `.env` file:

```
DEBUG_MODE=true
DEBUG_PROVIDER=<provider>
DEBUG_MODEL=<model-id>
DEBUG_TEST=<test-name>
```

Debug mode runs only one provider/model combination, making it much faster for testing during development.

#### Running Multiple Models in Debug Mode

You can now specify multiple models to test in debug mode by providing a comma-separated list:

```
DEBUG_MODE=true
DEBUG_PROVIDER=<provider>
DEBUG_MODEL=<model-id-1>,<model-id-2>,<model-id-3>
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

### Local Model Speed (Ollama)

For local models, generation speed matters as much as accuracy. After benchmarking Ollama models,
measure their tokens per second and store the figure alongside the results:

```bash
pnpm ollama-tps
```

The script scans every benchmark JSON file for results from the `ollama` provider, loads each model
on the Ollama host (`OLLAMA_HOST`), sends it a single test prompt (`counter` by default) and derives
tokens per second from the timings Ollama reports. The result is written into each affected benchmark
file as `tps` (plus a `tpsDetails` record of the measurement), and shows up as a **Speed** column in the
leaderboard and as a badge next to the model name in the detailed results after the next `pnpm build`.

Models that already have a `tps` value are skipped, so the script is safe to re-run after each batch.

```bash
# Only list what would be measured
pnpm ollama-tps -- --dry-run

# Re-measure models that already have a tps value
pnpm ollama-tps -- --force

# Use a different test prompt, or pull models missing from the Ollama host
OLLAMA_TPS_TEST=hello-world pnpm ollama-tps
OLLAMA_TPS_PULL=true pnpm ollama-tps
```

### Local Model Response Time (Ollama)

Tokens per second only tells half the story: a model that thinks for thousands of tokens is slow
even at a high speed. The benchmark run itself does not record token counts, so a separate script
measures how many output tokens each Ollama model produces per response:

```bash
pnpm ollama-token-times
```

For every Ollama model in the benchmark results it sends **one sample per test** (9 requests per model)
at the model's default temperature and records the token counts and timings Ollama reports in
`benchmarks/token-times-ollama/<model>.json`. `pnpm merge` (part of `pnpm build`) joins those files
with the results: the average output token count divided by the model's `tps` estimates how long a
typical response took, shown as an **Avg. response** column in the leaderboard and as a badge next to
the model name (hover it for the token count). The measurements only affect the merged report; the
individual benchmark files are left untouched.

Progress is saved after every sample, so an interrupted run resumes where it stopped, and models whose
file already covers every test are skipped. `run-ollama-token-times.sh` runs it for a list of models
one at a time, logging to `logs/`, and rebuilds the report afterwards.

```bash
# Only the given model(s)
pnpm ollama-token-times -- --model gpt-oss:20b --model lfm2:24b

# Only list what would be measured
pnpm ollama-token-times -- --dry-run

# Discard existing samples and measure again
pnpm ollama-token-times -- --force

# Pull models missing from the Ollama host
OLLAMA_TOKEN_TIMES_PULL=true pnpm ollama-token-times
```

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
