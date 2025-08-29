# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with SvelteBench.

## Installation Issues

### Node.js Version Problems

**Symptom**: Package installation fails or runtime errors
```
Error: Unsupported Node.js version
```

**Solution**:
```bash
# Check current Node.js version
node --version

# Use the correct version (see .nvmrc)
nvm use

# Or install the required version
nvm install node
```

### Package Installation Failures

**Symptom**: `npm install` or `pnpm install` fails

**Solutions**:
```bash
# Clear package manager cache
npm cache clean --force
# or
pnpm store prune

# Delete lock files and node_modules
rm -rf node_modules package-lock.json pnpm-lock.yaml
npm install
# or
pnpm install

# Use specific registry if needed
npm install --registry https://registry.npmjs.org/
```

### TypeScript Configuration Issues

**Symptom**: Type checking errors during installation
```
Error: Cannot find type definitions
```

**Solution**:
```bash
# Ensure TypeScript is installed
npm install -g typescript

# Check TypeScript configuration
npx tsc --noEmit

# Update type definitions
npm update @types/*
```

## API Configuration Issues

### Missing API Keys

**Symptom**: No providers found or authentication errors
```
No LLM provider/model combinations found
```

**Solution**:
1. Copy environment template:
   ```bash
   cp .env.example .env
   ```

2. Add at least one API key to `.env`:
   ```bash
   OPENAI_API_KEY=sk-...
   # or
   ANTHROPIC_API_KEY=sk-ant-...
   # or
   GEMINI_API_KEY=...
   ```

3. Verify configuration:
   ```bash
   DEBUG_MODE=true DEBUG_PROVIDER=openai DEBUG_MODEL=gpt-4 npm run run-tests
   ```

### Invalid API Keys

**Symptom**: Authentication errors
```
401 Unauthorized
Invalid API key
```

**Solutions**:
- **Check key format**: Ensure keys are complete and correctly formatted
- **Verify permissions**: Ensure keys have appropriate access
- **Check quotas**: Verify account has remaining credits/usage
- **Test directly**: Use provider's official tools to verify keys

### Rate Limiting

**Symptom**: Too many requests errors
```
429 Too Many Requests
Rate limit exceeded
```

**Solutions**:
```bash
# Use debug mode to reduce requests
DEBUG_MODE=true npm run run-tests

# Use sequential execution (slower but more reliable)
PARALLEL_EXECUTION=false npm run run-tests

# Wait and retry
sleep 60 && npm run run-tests
```

## Execution Issues

### Tests Timing Out

**Symptom**: Tests fail with timeout errors
```
Test timed out after 120 seconds
```

**Solutions**:
1. **Use debug mode** for faster testing:
   ```bash
   DEBUG_MODE=true DEBUG_TEST=simple-component npm run run-tests
   ```

2. **Check network connectivity**:
   ```bash
   ping api.openai.com
   curl -I https://api.anthropic.com
   ```

3. **Reduce test complexity** temporarily
4. **Try different models** - some respond faster

### Generation Failures

**Symptom**: LLM fails to generate valid code
```
Failed to generate valid component
SyntaxError: Unexpected token
```

**Solutions**:
1. **Review prompt clarity** in test `prompt.md`
2. **Add context file**:
   ```bash
   npm run run-tests -- --context ./context/svelte.dev/llms-small.txt
   ```
3. **Try different temperature**:
   ```bash
   # Lower temperature for more consistent output
   # Modify provider code to use temperature=0.1
   ```
4. **Check model capabilities** - some models are better at code generation

### Component Test Failures

**Symptom**: Generated components fail validation tests
```
Expected element to be in document
Component does not render correctly
```

**Solutions**:
1. **Review test expectations** in `test.ts`
2. **Check Svelte 5 syntax** in prompt requirements
3. **Use debug mode** to inspect generated code:
   ```bash
   DEBUG_MODE=true DEBUG_TEST=failing-test npm run run-tests
   # Check tmp/ directory for generated components
   ```
4. **Improve prompt specificity**

## File System Issues

### Permission Errors

**Symptom**: Cannot write to temporary directories
```
EACCES: permission denied, mkdir 'tmp'
```

**Solutions**:
```bash
# Check directory permissions
ls -la tmp/

# Fix permissions
chmod 755 tmp/
sudo chown -R $USER:$USER tmp/

# Or remove and recreate
rm -rf tmp/
mkdir tmp/
```

### Disk Space Issues

**Symptom**: No space left on device
```
ENOSPC: no space left on device
```

**Solutions**:
```bash
# Check available space
df -h

# Clean temporary files
rm -rf tmp/*
rm -rf node_modules/.cache/

# Clean old benchmark results
rm -rf benchmarks/benchmark-results-*.json
```

### File Lock Issues

**Symptom**: Files in use or locked
```
EBUSY: resource busy or locked
```

**Solutions**:
```bash
# Kill any running Node processes
pkill -f node

# Remove lock files
rm -rf package-lock.json pnpm-lock.yaml

# Restart and reinstall
npm install
```

## Network and Connectivity Issues

### Proxy Configuration

**Symptom**: Network requests fail behind corporate firewall
```
ENOTFOUND api.openai.com
```

**Solutions**:
```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# Or configure npm proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

### DNS Resolution Issues

**Symptom**: Cannot resolve API endpoints
```
ENOTFOUND api.anthropic.com
```

**Solutions**:
```bash
# Check DNS resolution
nslookup api.openai.com
nslookup api.anthropic.com

# Try alternative DNS
export DNS_SERVER=8.8.8.8

# Flush DNS cache (macOS)
sudo dscacheutil -flushcache

# Flush DNS cache (Linux)
sudo systemctl flush-dns
```

## Performance Issues

### Slow Execution

**Symptom**: Benchmarks take extremely long to complete

**Solutions**:
1. **Enable parallel execution**:
   ```bash
   PARALLEL_EXECUTION=true npm run run-tests
   ```

2. **Use debug mode**:
   ```bash
   DEBUG_MODE=true DEBUG_PROVIDER=openai DEBUG_MODEL=gpt-4-turbo npm run run-tests
   ```

3. **Reduce sample count** (modify configuration)
4. **Choose faster models** for testing

### Memory Issues

**Symptom**: Out of memory errors
```
JavaScript heap out of memory
```

**Solutions**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Use sequential execution
PARALLEL_EXECUTION=false npm run run-tests

# Clean temporary files frequently
rm -rf tmp/*
```

## Debugging Techniques

### Enable Verbose Logging

```bash
# Set debug environment
DEBUG=* npm run run-tests

# Or Node.js debugging
NODE_DEBUG=* npm run run-tests
```

### Inspect Generated Components

```bash
# Run single test and inspect output
DEBUG_MODE=true DEBUG_TEST=counter npm run run-tests

# Check generated files
ls -la tmp/*/counter-sample-*/
cat tmp/*/counter-sample-*/App.svelte
```

### Manual Test Execution

```bash
# Run specific test file manually
npx vitest run src/tests/counter/test.ts

# Run with generated component
cp tmp/anthropic/counter-sample-0/App.svelte src/tests/counter/
npx vitest run src/tests/counter/test.ts
```

### API Response Inspection

Add logging to provider code:
```typescript
// In src/llms/your-provider.ts
console.log('Request:', JSON.stringify(requestOptions, null, 2));
console.log('Response:', response);
```

## Environment-Specific Issues

### Windows Issues

**Common problems and solutions**:
```bash
# Path separator issues
# Use forward slashes in configuration

# PowerShell execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Line ending issues
git config core.autocrlf true
```

### macOS Issues

**Common problems and solutions**:
```bash
# Homebrew Node.js conflicts
brew uninstall node
nvm install node

# Permission issues with global packages
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Linux Issues

**Common problems and solutions**:
```bash
# Missing build tools
sudo apt-get install build-essential

# Node.js version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
```

## Getting Additional Help

### Collecting Debug Information

Before reporting issues, collect:
```bash
# System information
node --version
npm --version
cat package.json | grep version

# Environment variables (sanitized)
printenv | grep -E "DEBUG_|PARALLEL_|.*_API_KEY" | sed 's/=.*/=***/'

# Error logs
npm run run-tests 2>&1 | tee debug.log
```

### Reporting Issues

When reporting issues, include:
1. **System information** (OS, Node.js version, etc.)
2. **Complete error messages**
3. **Steps to reproduce**
4. **Expected vs actual behavior**
5. **Relevant configuration** (sanitized API keys)

### Community Resources

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share experiences
- **Wiki**: Check for updated troubleshooting guides

### Professional Support

For enterprise users:
- **Priority support** may be available
- **Custom deployment** assistance
- **Integration guidance** for specific environments

---

*This troubleshooting guide is continuously updated. If you encounter an issue not covered here, please contribute by reporting it or submitting a solution.*