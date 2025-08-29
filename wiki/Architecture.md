# Architecture Overview

This document provides a technical overview of SvelteBench's architecture and design principles.

## Core Architecture

SvelteBench follows a modular architecture designed for extensibility and reliability:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   index.ts      │    │  Test Manager   │    │  LLM Providers  │
│  (Orchestrator) │◄──►│   (Sequential/  │◄──►│   (OpenAI,      │
│                 │    │    Parallel)    │    │   Anthropic,    │
└─────────────────┘    └─────────────────┘    │   Google, etc.) │
         │                       │             └─────────────────┘
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Test Runner    │    │  File System    │
│  (Vitest)       │    │  (Checkpoints,  │
│                 │    │   Results)      │
└─────────────────┘    └─────────────────┘
```

## Key Components

### 1. Main Orchestrator (`index.ts`)
- Entry point for the benchmark
- Handles command-line arguments and environment configuration
- Coordinates the overall benchmark execution flow
- Manages debug mode and provider selection

### 2. Test Management (`src/utils/`)

#### Sequential Test Manager (`test-manager.ts`)
- Default execution mode
- Runs tests one at a time with sequential sample generation
- Full checkpointing and resumption support
- Detailed progress reporting

#### Parallel Test Manager (`parallel-test-manager.ts`)
- Optional faster execution mode
- Parallel sample generation within each test
- Optimized for speed while maintaining reliability
- Activated with `PARALLEL_EXECUTION=true`

### 3. LLM Provider Abstraction (`src/llms/`)

Each provider implements the `LLMProvider` interface:
```typescript
interface LLMProvider {
  generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string>;
  getModels(): string[];
  getModelIdentifier(): string;
}
```

**Supported Providers:**
- **OpenAI** (`openai.ts`) - GPT-4, GPT-4o, o1, o3, o4 models
- **Anthropic** (`anthropic.ts`) - Claude 3.5, Claude 4 models  
- **Google** (`google.ts`) - Gemini 2.5 models
- **OpenRouter** (`openrouter.ts`) - Multi-provider access

### 4. Test Runner (`src/utils/test-runner.ts`)
- Integrates with Vitest for component testing
- Manages temporary component files
- Handles test execution and result collection
- 120-second timeout per test

### 5. Test Definitions (`src/tests/`)

Each test consists of:
```
src/tests/test-name/
├── prompt.md    # Instructions for the LLM
└── test.ts      # Vitest tests for validation
```

## Data Flow

1. **Initialization**: Load configuration, providers, and test definitions
2. **Test Discovery**: Scan `src/tests/` for valid test pairs
3. **Sample Generation**: For each test, generate N samples using LLM providers
4. **Component Testing**: Write generated code to temporary files and run Vitest
5. **Result Collection**: Aggregate results and calculate pass@k metrics
6. **Checkpointing**: Save progress for resumption capability

## File System Organization

### Runtime Directories
```
tmp/
├── {provider}/
│   ├── {test-name}-sample-{n}/
│   │   ├── App.svelte          # Generated component
│   │   └── App.test.ts         # Generated test file
│   └── ...
└── checkpoints/                # Resumption data
```

### Output
```
benchmarks/
├── benchmark-results-{timestamp}.json
├── benchmark-results-with-context-{timestamp}.json
└── benchmark-results-merged.json
```

## HumanEval Methodology

SvelteBench implements the HumanEval evaluation approach:

- **Pass@k Metrics**: Calculate probability that at least one of k generated samples passes
- **Sample Generation**: Default 10 samples per test (1 for expensive models)
- **Binary Evaluation**: Each sample either passes or fails all tests
- **Statistical Analysis**: Robust measurement of LLM performance

## Configuration Management

### Environment Variables
- `DEBUG_MODE`: Enable single provider/model testing
- `DEBUG_PROVIDER`: Specify provider for debug mode
- `DEBUG_MODEL`: Specify model(s) for debug mode (comma-separated)
- `DEBUG_TEST`: Limit to specific test in debug mode
- `PARALLEL_EXECUTION`: Enable parallel sample generation

### Context Support
- Context files provide additional documentation to LLMs
- Improves component generation quality
- Integrated into prompt construction

## Error Handling and Resilience

- **Checkpointing**: Sample-level progress saving
- **Retry Logic**: Automatic retry for transient failures
- **Graceful Degradation**: Continue with other tests if one fails
- **Cleanup**: Automatic temporary file management

## Extensibility Points

### Adding New Providers
1. Implement `LLMProvider` interface
2. Add to provider discovery in main orchestrator
3. Configure environment variables

### Adding New Tests
1. Create directory in `src/tests/`
2. Add `prompt.md` with LLM instructions
3. Add `test.ts` with Vitest validation

### Custom Metrics
- Extend result collection in test managers
- Modify visualization in `build-static.ts`

## Performance Considerations

- **Memory**: Temporary files cleaned per test
- **Concurrency**: Configurable parallel execution
- **API Limits**: Retry logic and rate limiting
- **Storage**: Efficient checkpointing format

## Security

- **API Keys**: Environment variable based configuration
- **Sandboxing**: Generated code runs in isolated Vitest environment
- **File System**: Controlled temporary directory usage