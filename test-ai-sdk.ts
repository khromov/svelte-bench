import { getRegistry } from './src/llms/ai-sdk/unified-registry.js';

async function test() {
  console.log('Initializing provider registry...');
  const registry = getRegistry();

  console.log('\nAvailable providers:');
  const available = ['openai', 'anthropic', 'google', 'openrouter', 'xai', 'groq', 'deepseek'];
  console.log(available);

  console.log('\nRegistry initialized successfully');
}

test().catch(console.error);
