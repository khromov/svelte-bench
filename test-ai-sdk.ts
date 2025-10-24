import { getRegistry, getAvailableProviders } from './src/llms/ai-sdk/unified-registry.js';

async function test() {
  console.log('Getting available providers...');
  const available = getAvailableProviders();
  console.log('Available providers:', available);

  console.log('\nInitializing registry...');
  const registry = await getRegistry();
  console.log('✅ Registry initialized successfully');

  // Test getting a language model
  if (process.env.OPENROUTER_API_KEY) {
    console.log('\nTesting OpenRouter model...');
    try {
      const model = (registry as any).languageModel('openrouter:openai/gpt-4o-mini');
      console.log('✅ OpenRouter model created successfully');
      console.log('   Model:', model);
    } catch (error) {
      console.error('❌ Failed to create OpenRouter model:', error);
    }
  }
}

test().catch(console.error);
