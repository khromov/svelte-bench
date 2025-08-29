# API Reference

This document provides detailed API documentation for SvelteBench's core interfaces and functions.

## Core Interfaces

### LLMProvider Interface

All LLM providers implement this interface:

```typescript
interface LLMProvider {
  generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string>;
  getModels(): string[];
  getModelIdentifier(): string;
}
```

#### Methods

##### `generateCode(prompt, temperature?, contextContent?)`
Generates Svelte component code from a prompt.

**Parameters:**
- `prompt` (string): The instruction for generating the component
- `temperature` (number, optional): Controls randomness (0.0-1.0, default varies by provider)
- `contextContent` (string, optional): Additional context (e.g., documentation)

**Returns:** `Promise<string>` - Generated Svelte component code

**Example:**
```typescript
const code = await provider.generateCode(
  "Create a counter component with increment/decrement buttons",
  0.7,
  svelteDocumentation
);
```

##### `getModels()`
Returns available models for the provider.

**Returns:** `string[]` - Array of model identifiers

##### `getModelIdentifier()`
Returns the currently configured model identifier.

**Returns:** `string` - Current model ID

### TestDefinition Interface

Represents a benchmark test case:

```typescript
interface TestDefinition {
  name: string;        // Test directory name
  promptPath: string;  // Path to prompt.md file
  testPath: string;    // Path to test.ts file
}
```

### HumanEvalResult Interface

Represents benchmark results for a test:

```typescript
interface HumanEvalResult {
  testName: string;
  provider: string;
  model: string;
  numSamples: number;
  passedSamples: number;
  passAtK: { [k: number]: number };
  samples: {
    sampleIndex: number;
    passed: boolean;
    generatedCode: string;
    testResults?: TestResult;
  }[];
  executionTimeMs: number;
  contextUsed: boolean;
}
```

## Core Functions

### Test Management

#### `loadTestDefinitions()`
Discovers and loads all test definitions from `src/tests/`.

**Returns:** `Promise<TestDefinition[]>`

**Example:**
```typescript
const tests = await loadTestDefinitions();
console.log(`Found ${tests.length} tests`);
```

#### `runSingleTest(test, provider, sampleIndex, temperature, contextContent?)`
Executes a single test sample.

**Parameters:**
- `test` (TestDefinition): Test to run
- `provider` (LLMProvider): LLM provider instance
- `sampleIndex` (number): Sample number for this test
- `temperature` (number): Temperature for generation
- `contextContent` (string, optional): Additional context

**Returns:** `Promise<BenchmarkResult>`

#### `runAllTestsHumanEval(provider, numSamples?, specificTests?, contextContent?)`
Runs complete HumanEval benchmark for a provider.

**Parameters:**
- `provider` (LLMProvider): LLM provider instance
- `numSamples` (number, optional): Samples per test (default: 10)
- `specificTests` (TestDefinition[], optional): Specific tests to run
- `contextContent` (string, optional): Additional context

**Returns:** `Promise<HumanEvalResult[]>`

### Provider Management

#### `getAllLLMProviders()`
Discovers all configured LLM providers.

**Returns:** `Promise<{ provider: LLMProvider; modelId: string }[]>`

**Example:**
```typescript
const providers = await getAllLLMProviders();
for (const { provider, modelId } of providers) {
  console.log(`Testing ${provider.constructor.name} with ${modelId}`);
}
```

### File Operations

#### `cleanTmpDir()`
Cleans temporary files directory.

**Returns:** `Promise<void>`

#### `writeToTmpFile(provider, testName, sampleIndex, filename, content)`
Writes content to a temporary file.

**Parameters:**
- `provider` (string): Provider name
- `testName` (string): Test name
- `sampleIndex` (number): Sample index
- `filename` (string): Target filename
- `content` (string): File content

**Returns:** `Promise<string>` - Full path to written file

#### `loadContextFile(filePath)`
Loads and validates a context file.

**Parameters:**
- `filePath` (string): Path to context file

**Returns:** `Promise<string>` - Context file content

### Checkpointing

#### `saveCheckpoint(provider, modelId, testName, data)`
Saves benchmark progress for resumption.

**Parameters:**
- `provider` (string): Provider name
- `modelId` (string): Model identifier
- `testName` (string): Test name
- `data` (CheckpointData): Progress data

**Returns:** `Promise<void>`

#### `loadCheckpoint(provider, modelId, testName)`
Loads saved progress for resumption.

**Parameters:**
- `provider` (string): Provider name
- `modelId` (string): Model identifier
- `testName` (string): Test name

**Returns:** `Promise<CheckpointData | null>`

### Metrics Calculation

#### `calculatePassAtK(passedSamples, totalSamples, k)`
Calculates pass@k metric using HumanEval methodology.

**Parameters:**
- `passedSamples` (number): Number of samples that passed
- `totalSamples` (number): Total number of samples
- `k` (number): k value for pass@k calculation

**Returns:** `number` - Pass@k probability

**Formula:**
```typescript
// If passedSamples >= k, probability is 1.0
// Otherwise, calculate probability that at least k out of totalSamples pass
```

## Environment Variables

### Required for Providers

```bash
# OpenAI
OPENAI_API_KEY=your_key_here

# Anthropic  
ANTHROPIC_API_KEY=your_key_here

# Google Gemini
GEMINI_API_KEY=your_key_here

# OpenRouter
OPENROUTER_API_KEY=your_key_here
OPENROUTER_SITE_URL=https://github.com/your-org/svelte-bench
OPENROUTER_SITE_NAME=SvelteBench
```

### Optional Configuration

```bash
# Debug mode
DEBUG_MODE=true
DEBUG_PROVIDER=anthropic
DEBUG_MODEL=claude-3-5-sonnet-20241022
DEBUG_TEST=counter

# Execution mode
PARALLEL_EXECUTION=true

# OpenRouter specific
OPENROUTER_PROVIDER=anthropic  # Force specific provider
```

## Command Line Interface

### Main Commands

```bash
# Full benchmark
npm start

# Tests only
npm run run-tests

# With context
npm run run-tests -- --context ./path/to/context.txt

# Build visualization
npm run build

# Verify results
npm run verify
```

### Debug Mode

```bash
# Single provider/model
DEBUG_MODE=true DEBUG_PROVIDER=openai DEBUG_MODEL=gpt-4 npm run run-tests

# Multiple models
DEBUG_MODE=true DEBUG_PROVIDER=anthropic DEBUG_MODEL=claude-3-5-sonnet,claude-3-opus npm run run-tests

# Single test
DEBUG_MODE=true DEBUG_TEST=counter npm run run-tests
```

## Error Codes

### Common Errors

- **PROVIDER_NOT_CONFIGURED**: API key missing for provider
- **MODEL_NOT_AVAILABLE**: Requested model not available
- **TEST_NOT_FOUND**: Test directory or files missing
- **GENERATION_FAILED**: LLM failed to generate valid code
- **TEST_EXECUTION_FAILED**: Generated component failed tests

### Error Handling

All async functions follow standard Promise rejection patterns:

```typescript
try {
  const result = await runSingleTest(test, provider, 0, 0.7);
} catch (error) {
  console.error('Test failed:', error.message);
  // Handle error appropriately
}
```

## Type Definitions

For complete TypeScript definitions, see:
- `src/llms/index.ts` - Provider interfaces
- `src/utils/test-manager.ts` - Test and result types
- `src/utils/humaneval.ts` - HumanEval specific types
- `src/utils/test-runner.ts` - Test execution types