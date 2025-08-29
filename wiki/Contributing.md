# Contributing to SvelteBench

Thank you for your interest in contributing to SvelteBench! This guide will help you get started.

## Development Setup

### Prerequisites
- Node.js (version specified in `.nvmrc`)
- npm or pnpm package manager
- Git
- At least one LLM provider API key for testing

### Local Development

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/your-username/svelte-bench.git
   cd svelte-bench
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Add your API keys for testing
   ```

4. **Verify setup**:
   ```bash
   # Type checking
   pnpm check
   
   # Run existing tests
   pnpm test
   
   # Quick benchmark test
   DEBUG_MODE=true DEBUG_PROVIDER=your_provider DEBUG_MODEL=your_model pnpm run-tests
   ```

## Types of Contributions

### 1. Adding New Tests

New test cases are always welcome! Each test should:

- Target a specific Svelte 5 feature or pattern
- Be challenging but achievable for modern LLMs
- Include comprehensive validation

**Steps to add a test**:

1. Create a directory in `src/tests/`:
   ```bash
   mkdir src/tests/your-test-name
   ```

2. Add `prompt.md` with clear instructions:
   ```markdown
   # Test Description
   
   Create a Svelte 5 component that...
   
   ## Requirements
   - Use Svelte 5 runes ($state, $derived, etc.)
   - Implement specific functionality
   - Follow best practices
   
   ## Example Usage
   <!-- Show how the component should be used -->
   ```

3. Add `test.ts` with comprehensive tests:
   ```typescript
   import { render, screen } from '@testing-library/svelte';
   import { expect, test } from 'vitest';
   import App from './App.svelte';
   
   test('should...', async () => {
     render(App);
     // Add your test assertions
   });
   ```

4. Test your new test:
   ```bash
   DEBUG_MODE=true DEBUG_TEST=your-test-name pnpm run-tests
   ```

### 2. Adding New LLM Providers

To add support for a new LLM provider:

1. Create a new file in `src/llms/`:
   ```typescript
   // src/llms/your-provider.ts
   import type { LLMProvider } from './index';
   
   export class YourProvider implements LLMProvider {
     async generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string> {
       // Implementation
     }
     
     getModels(): string[] {
       // Return available models
     }
     
     getModelIdentifier(): string {
       // Return current model ID
     }
   }
   ```

2. Update `src/llms/index.ts` to include your provider
3. Add configuration to `getAllLLMProviders()` function
4. Add environment variables to `.env.example`
5. Update documentation

### 3. Bug Fixes and Improvements

- **Bug Reports**: Include reproduction steps, expected vs actual behavior
- **Performance**: Profile and benchmark improvements
- **Documentation**: Fix typos, improve clarity, add examples
- **Tests**: Improve test coverage or reliability

## Code Standards

### TypeScript
- Use strict TypeScript configuration
- Provide type annotations for public APIs
- Avoid `any` types when possible

### Code Style
- Follow existing formatting (we may add Prettier in the future)
- Use meaningful variable and function names
- Add JSDoc comments for public functions

### Testing
- Write tests for new functionality
- Ensure existing tests continue to pass
- Use Vitest for unit tests
- Follow existing test patterns

## Benchmark Test Guidelines

When creating new benchmark tests:

### Good Test Characteristics
- **Clear Objective**: Specific Svelte 5 feature or pattern
- **Reasonable Complexity**: Challenging but achievable
- **Comprehensive Validation**: Test all requirements
- **Realistic Use Case**: Based on real-world scenarios

### Test Prompt Best Practices
- Provide clear, unambiguous instructions
- Include required Svelte 5 syntax (runes, etc.)
- Specify expected behavior
- Give examples when helpful
- Avoid overly complex requirements in a single test

### Test Validation Best Practices
- Test functionality, not implementation details
- Use user-centric assertions (what users see/experience)
- Include edge cases
- Test accessibility when relevant
- Validate Svelte 5 specific features

## Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow coding standards
   - Add/update tests
   - Update documentation if needed

3. **Test thoroughly**:
   ```bash
   pnpm check          # Type checking
   pnpm test           # Unit tests
   pnpm run-tests      # Integration test with your changes
   ```

4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add support for new provider XYZ"
   # or
   git commit -m "test: add component state management test"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **PR Description**:
   - Clearly describe the changes
   - Reference any related issues
   - Include testing instructions
   - Note any breaking changes

## Development Tips

### Debug Mode
Use debug mode for faster iteration:
```bash
DEBUG_MODE=true DEBUG_PROVIDER=anthropic DEBUG_MODEL=claude-3-5-sonnet-20241022 DEBUG_TEST=your-test pnpm run-tests
```

### Context Testing
Test with and without context:
```bash
# Without context
pnpm run-tests

# With context
pnpm run-tests -- --context ./context/svelte.dev/llms-small.txt
```

### Local Testing
- Test your changes against multiple providers
- Verify checkpointing works correctly
- Test both sequential and parallel execution modes

## Getting Help

- **Questions**: Open a discussion on GitHub
- **Bug Reports**: Create an issue with reproduction steps
- **Feature Requests**: Discuss in issues before implementing
- **Code Review**: Maintainers will review PRs and provide feedback

## Recognition

Contributors will be:
- Added to the contributors list
- Credited in release notes for significant contributions
- Recognized in the project documentation

Thank you for helping make SvelteBench better!