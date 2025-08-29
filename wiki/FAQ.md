# Frequently Asked Questions

## General Questions

### What is SvelteBench?

SvelteBench is an LLM benchmark tool specifically designed for evaluating how well large language models can generate Svelte 5 components. It uses the HumanEval methodology to provide standardized, reproducible measurements of LLM performance on frontend development tasks.

### How does SvelteBench differ from other LLM benchmarks?

- **Svelte 5 Specific**: Focuses specifically on modern Svelte development with runes
- **Component-Based**: Tests real component generation, not just code snippets
- **Functional Testing**: Generated components are actually executed and tested
- **HumanEval Methodology**: Uses industry-standard evaluation approach with pass@k metrics

### Which LLM providers are supported?

Currently supported providers:
- **OpenAI**: GPT-4, GPT-4o, o1, o3, o4 models
- **Anthropic**: Claude 3.5, Claude 4 models
- **Google**: Gemini 2.5 models
- **OpenRouter**: Access to multiple providers through a single API

## Setup and Configuration

### Do I need API keys for all providers?

No, you only need API keys for the providers you want to test. SvelteBench will automatically detect which providers are configured and skip the others.

### How much does it cost to run a benchmark?

Costs depend on the models and number of tests:
- **Debug mode** (single model, single test): $0.10-$1.00
- **Full benchmark** (all models, all tests): $10-$100+
- **Context usage** increases costs due to longer prompts

Use debug mode for development and testing to minimize costs.

### Can I run SvelteBench offline?

No, SvelteBench requires internet access to communicate with LLM providers. However, you can:
- Use local models through OpenRouter (if available)
- Cache results for offline analysis
- Use debug mode to minimize API calls

## Usage Questions

### How do I test just one specific model?

Use debug mode:
```bash
DEBUG_MODE=true
DEBUG_PROVIDER=anthropic
DEBUG_MODEL=claude-3-5-sonnet-20241022
DEBUG_TEST=counter  # Optional: test specific test only
npm run run-tests
```

### What's the difference between sequential and parallel execution?

- **Sequential (default)**: Generates samples one at a time, more reliable, better progress tracking
- **Parallel**: Generates samples simultaneously, faster but more resource intensive

Set `PARALLEL_EXECUTION=true` for parallel mode.

### How do I resume an interrupted benchmark?

SvelteBench automatically saves checkpoints at the sample level. Simply re-run the same command and it will resume from where it left off:

```bash
# This will resume automatically if interrupted
npm run run-tests
```

### Should I use context files?

Yes, context files generally improve results by providing LLMs with relevant Svelte documentation. Use the included context files:

```bash
npm run run-tests -- --context ./context/svelte.dev/llms-small.txt
```

## Test Development

### How do I create a new test?

1. Create a directory in `src/tests/`:
   ```bash
   mkdir src/tests/my-test
   ```

2. Add `prompt.md` with clear instructions for the LLM
3. Add `test.ts` with Vitest tests to validate the generated component
4. Test with debug mode:
   ```bash
   DEBUG_MODE=true DEBUG_TEST=my-test npm run run-tests
   ```

### What makes a good test?

- **Clear objective**: Tests a specific Svelte 5 feature or pattern
- **Appropriate difficulty**: Challenging but achievable for modern LLMs
- **Comprehensive validation**: Tests all requirements thoroughly
- **Realistic scenario**: Based on real-world use cases

### How complex should test prompts be?

Start simple and gradually increase complexity. Good prompts:
- Have clear, unambiguous requirements
- Include examples when helpful
- Specify Svelte 5 syntax requirements
- Focus on one main feature or pattern per test

## Results and Metrics

### What do pass@k metrics mean?

Pass@k represents the probability that at least one out of k generated samples passes all tests:

- **Pass@1**: Probability of success on first try (most important)
- **Pass@5**: Probability of success with 5 attempts
- **Pass@10**: Probability of success with 10 attempts

Higher pass@k values indicate better model performance.

### How should I interpret the results?

Consider:
- **Sample size**: More samples = more reliable metrics
- **Test difficulty**: Compare models on same tests
- **Context usage**: Models perform better with context
- **Temperature**: Lower temperature = more consistent results

### Why do some models have different sample counts?

Expensive models (like o1) default to 1 sample per test, while others use 10 samples. This is configurable but helps manage costs.

## Technical Questions

### What version of Svelte does SvelteBench target?

SvelteBench specifically targets **Svelte 5** with runes. Tests should use:
- `$state()` for reactive state
- `$derived()` for computed values
- `$effect()` for side effects
- Modern Svelte 5 syntax and patterns

### How are generated components executed?

1. LLM generates component code
2. Code is written to temporary files in `tmp/` directory
3. Vitest runs the test suite against the generated component
4. Results are collected and aggregated
5. Temporary files are cleaned up

### Can I run custom analysis on results?

Yes! Results are saved as JSON files in the `benchmarks/` directory. You can:
- Load JSON files programmatically
- Build custom visualizations
- Calculate additional metrics
- Compare results across runs

### How does checkpointing work?

SvelteBench saves progress after each sample:
- Checkpoint data is stored in `tmp/checkpoints/`
- Includes provider, model, test, and completion status
- Automatically resumes from last completed sample
- Works with both sequential and parallel execution

## Performance and Optimization

### How can I make benchmarks run faster?

1. **Use parallel execution**: `PARALLEL_EXECUTION=true`
2. **Enable debug mode**: Test specific models/tests
3. **Reduce sample count**: Modify configuration for fewer samples
4. **Use faster models**: Some models have quicker response times

### Why are some tests slow?

Factors affecting speed:
- **Model response time**: Varies by provider and model
- **Test complexity**: Complex prompts take longer to process
- **Context size**: Larger context files increase processing time
- **Network latency**: Geographic distance to API endpoints

### How much disk space does SvelteBench use?

- **Temporary files**: Cleaned up automatically, minimal persistent usage
- **Results**: JSON files are typically 1-10MB each
- **Checkpoints**: Small files, cleaned up after completion
- **Generated components**: Stored only during test execution

## Error Handling

### What should I do if tests are failing?

1. **Check API keys**: Ensure they're valid and have sufficient quota
2. **Use debug mode**: Test with a single, simple test
3. **Check network**: Ensure stable internet connection
4. **Review logs**: Look for specific error messages
5. **Update dependencies**: Ensure all packages are current

### Why do some samples fail to generate?

Common causes:
- **API rate limits**: Wait and retry
- **Invalid prompts**: Review prompt clarity
- **Model limitations**: Some models struggle with certain tasks
- **Network issues**: Temporary connectivity problems

### How do I handle rate limiting?

- **Use debug mode** for development
- **Space out runs** to avoid hitting limits
- **Consider multiple API keys** for higher limits
- **Use parallel execution carefully** to avoid overwhelming APIs

## Best Practices

### How often should I run benchmarks?

- **Development**: Use debug mode frequently
- **CI/CD**: Weekly or monthly full benchmarks
- **Research**: Regular runs when comparing models
- **Production**: Quarterly or when evaluating new models

### What's the best way to compare models?

1. **Same hardware/network**: Consistent testing conditions
2. **Same tests**: Use identical test suites
3. **Multiple runs**: Average results over several runs
4. **Control variables**: Same temperature, context, etc.
5. **Statistical significance**: Ensure adequate sample sizes

### How should I manage API costs?

1. **Start with debug mode** for development
2. **Use context files judiciously** (they increase prompt length)
3. **Monitor usage** through provider dashboards
4. **Set spending limits** on API accounts
5. **Choose models strategically** based on cost/performance

### Can I contribute to SvelteBench?

Absolutely! Contributions welcome:
- **New tests**: Add challenging, realistic test cases
- **Provider support**: Add new LLM providers
- **Bug fixes**: Improve reliability and performance
- **Documentation**: Help improve guides and examples

See the [Contributing Guide](Contributing.md) for details.