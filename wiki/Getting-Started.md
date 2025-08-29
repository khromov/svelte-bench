# Getting Started with SvelteBench

This guide will help you set up and run SvelteBench for evaluating LLM-generated Svelte components.

## Prerequisites

- **Node.js**: Version specified in `.nvmrc` (use `nvm use` if you have nvm installed)
- **Package Manager**: npm or pnpm
- **LLM API Keys**: At least one provider (OpenAI, Anthropic, Google, or OpenRouter)

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/khromov/svelte-bench.git
   cd svelte-bench
   ```

2. **Install dependencies**:
   ```bash
   # Using npm
   npm install
   
   # Using pnpm (recommended)
   pnpm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Configure API keys** in `.env`:
   ```bash
   # OpenAI (optional)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Anthropic (optional)
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   
   # Google Gemini (optional)
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # OpenRouter (optional)
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_SITE_URL=https://github.com/khromov/svelte-bench
   OPENROUTER_SITE_NAME=SvelteBench
   ```

## Basic Usage

### Running Your First Benchmark

```bash
# Full benchmark (all configured providers and models)
npm start

# Or with pnpm
pnpm start
```

### Debug Mode (Recommended for First Run)

For faster testing during development:

```bash
# Add to your .env file
DEBUG_MODE=true
DEBUG_PROVIDER=anthropic
DEBUG_MODEL=claude-3-5-sonnet-20241022
```

Then run:
```bash
npm run run-tests
```

### Using Context Files

Include Svelte documentation to improve LLM performance:

```bash
npm run run-tests -- --context ./context/svelte.dev/llms-small.txt
```

### Parallel Execution

For faster execution:

```bash
PARALLEL_EXECUTION=true npm run run-tests
```

## Execution Modes

### Sequential (Default)
- Tests run one at a time
- Samples generated sequentially
- More reliable for long-running benchmarks
- Better progress tracking

### Parallel
- Samples within tests generated in parallel
- Faster execution
- Set `PARALLEL_EXECUTION=true`

## Understanding Results

Results are saved to timestamped JSON files in the `benchmarks/` directory:
- `benchmark-results-{timestamp}.json` - Standard results
- `benchmark-results-with-context-{timestamp}.json` - Results with context

### Viewing Results

Build the visualization:
```bash
npm run build
```

Open `dist/index.html` in your browser to view the interactive results.

## Next Steps

- [Architecture](Architecture.md) - Understand how SvelteBench works
- [Examples](Examples.md) - See more usage examples
- [Contributing](Contributing.md) - Learn how to add tests or contribute code
- [Troubleshooting](Troubleshooting.md) - Solve common issues