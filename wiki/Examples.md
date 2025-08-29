# Examples and Usage Patterns

This document provides practical examples of using SvelteBench for various scenarios.

## Basic Usage Examples

### 1. Quick Start with Debug Mode

Perfect for testing a specific provider/model combination:

```bash
# Set up environment
DEBUG_MODE=true
DEBUG_PROVIDER=anthropic
DEBUG_MODEL=claude-3-5-sonnet-20241022
DEBUG_TEST=counter

# Run the test
npm run run-tests
```

**Output**: Tests only the counter test with Claude 3.5 Sonnet.

### 2. Full Benchmark Run

```bash
# Run all providers and models
npm start
```

This will:
1. Run all configured providers and models
2. Execute all tests in `src/tests/`
3. Generate visualization in `dist/`

### 3. Using Context Files

```bash
# With Svelte documentation context
npm run run-tests -- --context ./context/svelte.dev/llms-small.txt

# With custom context
npm run run-tests -- --context ./path/to/your/context.txt
```

Context files help LLMs generate better Svelte 5 components by providing relevant documentation.

## Advanced Configuration Examples

### Multiple Models in Debug Mode

```bash
# Test multiple models from the same provider
DEBUG_MODE=true
DEBUG_PROVIDER=anthropic
DEBUG_MODEL=claude-3-5-sonnet-20241022,claude-3-opus-20240229,claude-3-5-haiku-20241022

npm run run-tests
```

### Parallel Execution

```bash
# Faster execution with parallel sample generation
PARALLEL_EXECUTION=true npm run run-tests
```

### Combining Options

```bash
# Debug mode + parallel execution + context
DEBUG_MODE=true \
DEBUG_PROVIDER=openai \
DEBUG_MODEL=gpt-4,gpt-4-turbo \
PARALLEL_EXECUTION=true \
npm run run-tests -- --context ./context/svelte.dev/llms-small.txt
```

## Creating Custom Tests

### Example: Todo List Component

**Directory Structure:**
```
src/tests/todo-list/
├── prompt.md
└── test.ts
```

**prompt.md:**
```markdown
# Todo List Component

Create a Svelte 5 component that implements a todo list with the following features:

## Requirements

- Use Svelte 5 runes ($state, $derived, etc.)
- Add new todos with an input field and button
- Mark todos as completed by clicking on them
- Delete todos with a delete button
- Show total count and completed count
- Filter todos by status (all, active, completed)

## Component Structure

The component should:
- Have an input field for new todos
- Display a list of todos with checkboxes
- Show filtering buttons
- Display counts

## Example Usage

```svelte
<TodoList />
```

The component should be self-contained and fully functional.
```

**test.ts:**
```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import userEvent from '@testing-library/user-event';
import App from './App.svelte';

test('should render todo input', async () => {
  render(App);
  expect(screen.getByRole('textbox')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
});

test('should add new todos', async () => {
  const user = userEvent.setup();
  render(App);
  
  const input = screen.getByRole('textbox');
  const addButton = screen.getByRole('button', { name: /add/i });
  
  await user.type(input, 'Learn Svelte 5');
  await user.click(addButton);
  
  expect(screen.getByText('Learn Svelte 5')).toBeInTheDocument();
});

test('should toggle todo completion', async () => {
  const user = userEvent.setup();
  render(App);
  
  // Add a todo first
  const input = screen.getByRole('textbox');
  const addButton = screen.getByRole('button', { name: /add/i });
  
  await user.type(input, 'Test todo');
  await user.click(addButton);
  
  // Click on the todo to toggle it
  const todoItem = screen.getByText('Test todo');
  await user.click(todoItem);
  
  // Check if it's marked as completed (implementation specific)
  expect(todoItem).toHaveClass('completed'); // or similar
});

test('should show todo counts', async () => {
  render(App);
  
  // Should show some form of count display
  expect(screen.getByText(/total|count/i)).toBeInTheDocument();
});
```

### Example: Data Visualization Component

**prompt.md:**
```markdown
# Chart Component

Create a Svelte 5 component that displays a simple bar chart using SVG.

## Requirements

- Accept data as a prop: `data: { label: string, value: number }[]`
- Use Svelte 5 runes for reactive state
- Render bars using SVG
- Include axis labels
- Responsive design that scales to container

## Props Interface

```typescript
interface Props {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
}
```

## Example Usage

```svelte
<BarChart data={[
  { label: 'A', value: 10 },
  { label: 'B', value: 20 },
  { label: 'C', value: 15 }
]} />
```
```

## Context File Examples

### Custom Context for Domain-Specific Tests

```text
# Custom Svelte Component Patterns

## State Management Best Practices
- Use $state() for component-local reactive state
- Use $derived() for computed values
- Use $effect() for side effects

## Component Communication
- Props for parent-to-child data flow
- Events for child-to-parent communication
- Context API for cross-component state

## Performance Tips
- Minimize $effect() usage
- Use $derived() instead of multiple $state() when possible
- Batch DOM updates when needed
```

### Specialized Documentation

```text
# Accessibility Guidelines for Svelte Components

## ARIA Labels
- Always provide aria-label for interactive elements
- Use semantic HTML elements when possible
- Provide alternative text for images

## Keyboard Navigation
- Ensure all interactive elements are keyboard accessible
- Implement proper focus management
- Use tabindex appropriately

## Screen Reader Support
- Use proper heading hierarchy
- Provide status announcements for dynamic content
- Label form controls properly
```

## Benchmarking Strategies

### Provider Comparison

```bash
# Compare specific models across providers
DEBUG_MODE=true DEBUG_MODEL=gpt-4 DEBUG_PROVIDER=openai npm run run-tests
DEBUG_MODE=true DEBUG_MODEL=claude-3-5-sonnet-20241022 DEBUG_PROVIDER=anthropic npm run run-tests
DEBUG_MODE=true DEBUG_MODEL=gemini-1.5-pro DEBUG_PROVIDER=google npm run run-tests
```

### Temperature Testing

Modify your provider code to test different temperatures:

```typescript
// In your test script
const temperatures = [0.0, 0.3, 0.7, 1.0];
for (const temp of temperatures) {
  await provider.generateCode(prompt, temp);
}
```

### Context Effectiveness

```bash
# Run without context
npm run run-tests

# Run with context
npm run run-tests -- --context ./context/svelte.dev/llms-small.txt

# Compare results in benchmarks/ directory
```

## Result Analysis Examples

### Viewing Results

```bash
# Build visualization
npm run build

# Open in browser
open dist/index.html
```

### Programmatic Analysis

```javascript
// Load results
const results = require('./benchmarks/benchmark-results-latest.json');

// Analyze pass rates
results.forEach(result => {
  console.log(`${result.provider}/${result.model}: ${result.passedSamples}/${result.numSamples} passed`);
  console.log(`Pass@1: ${result.passAtK[1]}`);
  console.log(`Pass@5: ${result.passAtK[5]}`);
});

// Find best performing models
const bestModels = results
  .sort((a, b) => b.passAtK[1] - a.passAtK[1])
  .slice(0, 5);
```

## Integration Examples

### CI/CD Pipeline

```yaml
# .github/workflows/benchmark.yml
name: SvelteBench
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run run-tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: |
            benchmarks/
            dist/
```

### Custom Metrics Collection

```typescript
// Custom analysis script
import { HumanEvalResult } from './src/utils/humaneval';

interface CustomMetrics {
  avgGenerationTime: number;
  syntaxErrorRate: number;
  featureCompleteness: number;
}

function analyzeResults(results: HumanEvalResult[]): CustomMetrics {
  const totalTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0);
  const avgTime = totalTime / results.length;
  
  // Custom analysis logic
  return {
    avgGenerationTime: avgTime,
    syntaxErrorRate: calculateSyntaxErrors(results),
    featureCompleteness: assessFeatureCompleteness(results)
  };
}
```

## Troubleshooting Examples

### Common Issues and Solutions

**Issue**: Tests timing out
```bash
# Increase timeout or reduce complexity
DEBUG_MODE=true DEBUG_TEST=simple-component npm run run-tests
```

**Issue**: API rate limits
```bash
# Use parallel execution with delays
PARALLEL_EXECUTION=false npm run run-tests
```

**Issue**: Generated code not compiling
```typescript
// Check for common syntax errors in generated code
// Add validation in your test definitions
```

## Best Practices

### Test Design
- Start with simple tests and gradually increase complexity
- Ensure tests are deterministic and reliable
- Include both positive and negative test cases
- Test edge cases and error conditions

### Provider Testing
- Test with multiple temperature values
- Use context files for domain-specific knowledge
- Compare providers on same hardware/network conditions
- Account for API latency and rate limits

### Result Interpretation
- Consider sample size when interpreting results
- Look at trends over multiple runs
- Account for test difficulty variations
- Consider pass@k metrics beyond just pass@1