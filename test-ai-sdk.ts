import { providerRegistry } from './src/llms/ai-sdk/registry.js';

async function test() {
  console.log('Initializing provider registry...');
  await providerRegistry.initialize();

  console.log('\nAvailable providers:');
  const available = await providerRegistry.getAvailableProviders();
  console.log(available);

  console.log('\nAll registered providers:');
  const all = await providerRegistry.getAllProviders();
  all.forEach(p => {
    const hasKey = !!process.env[p.envKey];
    const status = hasKey ? '✅' : '⚠️ ';
    console.log(`${status} ${p.name} (${p.packageName})`);
  });

  // Test getting a provider
  if (process.env.OPENROUTER_API_KEY) {
    console.log('\nTesting OpenRouter provider...');
    const provider = await providerRegistry.getProvider('openrouter', 'openai/gpt-4o-mini');
    if (provider) {
      console.log('✅ OpenRouter provider created successfully');
      console.log('   Name:', provider.name);
      console.log('   Model:', provider.getModelIdentifier());
    }
  }
}

test().catch(console.error);
