/**
 * Unified AI SDK Provider Registry
 * Official AI SDK providers only (from https://ai-sdk.dev/providers/ai-sdk-providers)
 */

import { createProviderRegistry } from 'ai';
import { log } from '../../utils/tui-events';

// Lazy imports to avoid loading unused providers
let registry: ReturnType<typeof createProviderRegistry> | null = null;

/**
 * Initialize and return the unified provider registry
 * Only includes OFFICIAL AI SDK providers with configured API keys
 * Providers are lazy-loaded on first use for efficiency
 */
export function getRegistry() {
  if (registry) return registry;

  const providers: Record<string, any> = {};

  // LANGUAGE MODEL PROVIDERS (Official AI SDK)

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    const { createOpenAI } = require('@ai-sdk/openai');
    providers.openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    const { createAnthropic } = require('@ai-sdk/anthropic');
    providers.anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // Google Generative AI
  if (process.env.GOOGLE_API_KEY) {
    const { createGoogleGenerativeAI } = require('@ai-sdk/google');
    providers.google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });
  }

  // Google Vertex AI
  if (process.env.GOOGLE_VERTEX_PROJECT) {
    const { createVertex } = require('@ai-sdk/google-vertex');
    providers['google-vertex'] = createVertex({
      project: process.env.GOOGLE_VERTEX_PROJECT,
      location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
    });
  }

  // Azure OpenAI
  if (process.env.AZURE_API_KEY && process.env.AZURE_RESOURCE_NAME) {
    const { createAzure } = require('@ai-sdk/azure');
    providers.azure = createAzure({
      apiKey: process.env.AZURE_API_KEY,
      resourceName: process.env.AZURE_RESOURCE_NAME,
    });
  }

  // xAI (Grok)
  if (process.env.XAI_API_KEY) {
    const { createXai } = require('@ai-sdk/xai');
    providers.xai = createXai({
      apiKey: process.env.XAI_API_KEY,
    });
  }

  // Vercel
  if (process.env.VERCEL_API_KEY) {
    const { createVercel } = require('@ai-sdk/vercel');
    providers.vercel = createVercel({
      apiKey: process.env.VERCEL_API_KEY,
    });
  }

  // Mistral
  if (process.env.MISTRAL_API_KEY) {
    const { createMistral } = require('@ai-sdk/mistral');
    providers.mistral = createMistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }

  // Cohere
  if (process.env.COHERE_API_KEY) {
    const { createCohere } = require('@ai-sdk/cohere');
    providers.cohere = createCohere({
      apiKey: process.env.COHERE_API_KEY,
    });
  }

  // Amazon Bedrock
  if (process.env.AWS_ACCESS_KEY_ID) {
    const { createAmazonBedrock } = require('@ai-sdk/amazon-bedrock');
    providers.bedrock = createAmazonBedrock({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  // Groq
  if (process.env.GROQ_API_KEY) {
    const { createGroq } = require('@ai-sdk/groq');
    providers.groq = createGroq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  // DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    const { createDeepSeek } = require('@ai-sdk/deepseek');
    providers.deepseek = createDeepSeek({
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  // Cerebras
  if (process.env.CEREBRAS_API_KEY) {
    const { createCerebras } = require('@ai-sdk/cerebras');
    providers.cerebras = createCerebras({
      apiKey: process.env.CEREBRAS_API_KEY,
    });
  }

  // Fireworks
  if (process.env.FIREWORKS_API_KEY) {
    const { createFireworks } = require('@ai-sdk/fireworks');
    providers.fireworks = createFireworks({
      apiKey: process.env.FIREWORKS_API_KEY,
    });
  }

  // Together.ai
  if (process.env.TOGETHER_API_KEY) {
    const { createTogetherAI } = require('@ai-sdk/togetherai');
    providers.togetherai = createTogetherAI({
      apiKey: process.env.TOGETHER_API_KEY,
    });
  }

  // Perplexity
  if (process.env.PERPLEXITY_API_KEY) {
    const { createPerplexity } = require('@ai-sdk/perplexity');
    providers.perplexity = createPerplexity({
      apiKey: process.env.PERPLEXITY_API_KEY,
    });
  }

  // DeepInfra
  if (process.env.DEEPINFRA_API_KEY) {
    const { createDeepInfra } = require('@ai-sdk/deepinfra');
    providers.deepinfra = createDeepInfra({
      apiKey: process.env.DEEPINFRA_API_KEY,
    });
  }

  // Baseten
  if (process.env.BASETEN_API_KEY) {
    const { createBaseten } = require('@ai-sdk/baseten');
    providers.baseten = createBaseten({
      apiKey: process.env.BASETEN_API_KEY,
    });
  }

  // Hugging Face
  if (process.env.HUGGINGFACE_API_KEY) {
    const { createOpenAICompatible } = require('@ai-sdk/openai-compatible');
    providers.huggingface = createOpenAICompatible({
      name: 'huggingface',
      apiKey: process.env.HUGGINGFACE_API_KEY,
      baseURL: 'https://api-inference.huggingface.co/v1',
    });
  }

  // MEDIA PROVIDERS (Image/Video/Audio Generation - included for completeness)

  // Replicate
  if (process.env.REPLICATE_API_KEY) {
    const { createReplicate } = require('@ai-sdk/replicate');
    providers.replicate = createReplicate({
      apiKey: process.env.REPLICATE_API_KEY,
    });
  }

  // Fal
  if (process.env.FAL_API_KEY) {
    const { createFal } = require('@ai-sdk/fal');
    providers.fal = createFal({
      apiKey: process.env.FAL_API_KEY,
    });
  }

  // Luma
  if (process.env.LUMA_API_KEY) {
    const { createLuma } = require('@ai-sdk/luma');
    providers.luma = createLuma({
      apiKey: process.env.LUMA_API_KEY,
    });
  }

  // ElevenLabs
  if (process.env.ELEVENLABS_API_KEY) {
    const { createElevenLabs } = require('@ai-sdk/elevenlabs');
    providers.elevenlabs = createElevenLabs({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  }

  // AssemblyAI
  if (process.env.ASSEMBLYAI_API_KEY) {
    const { createAssemblyAI } = require('@ai-sdk/assemblyai');
    providers.assemblyai = createAssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY,
    });
  }

  // Deepgram
  if (process.env.DEEPGRAM_API_KEY) {
    const { createDeepgram } = require('@ai-sdk/deepgram');
    providers.deepgram = createDeepgram({
      apiKey: process.env.DEEPGRAM_API_KEY,
    });
  }

  // Gladia
  if (process.env.GLADIA_API_KEY) {
    const { createGladia } = require('@ai-sdk/gladia');
    providers.gladia = createGladia({
      apiKey: process.env.GLADIA_API_KEY,
    });
  }

  // LMNT
  if (process.env.LMNT_API_KEY) {
    const { createLMNT } = require('@ai-sdk/lmnt');
    providers.lmnt = createLMNT({
      apiKey: process.env.LMNT_API_KEY,
    });
  }

  // Hume
  if (process.env.HUME_API_KEY) {
    const { createHume } = require('@ai-sdk/hume');
    providers.hume = createHume({
      apiKey: process.env.HUME_API_KEY,
    });
  }

  // Rev.ai
  if (process.env.REVAI_API_KEY) {
    const { createRevAI } = require('@ai-sdk/revai');
    providers.revai = createRevAI({
      apiKey: process.env.REVAI_API_KEY,
    });
  }

  // Log registered providers
  const providerNames = Object.keys(providers);
  log(`✓ Registered ${providerNames.length} AI SDK providers:`, providerNames.join(', '));

  // Create and cache registry
  registry = createProviderRegistry(providers);
  return registry;
}

/**
 * Get list of available provider names
 * Checks environment variables without initializing providers
 */
export function getAvailableProviders(): string[] {
  const providers: string[] = [];

  // Language Models
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic');
  if (process.env.GOOGLE_API_KEY) providers.push('google');
  if (process.env.GOOGLE_VERTEX_PROJECT) providers.push('google-vertex');
  if (process.env.AZURE_API_KEY && process.env.AZURE_RESOURCE_NAME) providers.push('azure');
  if (process.env.XAI_API_KEY) providers.push('xai');
  if (process.env.VERCEL_API_KEY) providers.push('vercel');
  if (process.env.MISTRAL_API_KEY) providers.push('mistral');
  if (process.env.COHERE_API_KEY) providers.push('cohere');
  if (process.env.AWS_ACCESS_KEY_ID) providers.push('bedrock');
  if (process.env.GROQ_API_KEY) providers.push('groq');
  if (process.env.DEEPSEEK_API_KEY) providers.push('deepseek');
  if (process.env.CEREBRAS_API_KEY) providers.push('cerebras');
  if (process.env.FIREWORKS_API_KEY) providers.push('fireworks');
  if (process.env.TOGETHER_API_KEY) providers.push('togetherai');
  if (process.env.PERPLEXITY_API_KEY) providers.push('perplexity');
  if (process.env.DEEPINFRA_API_KEY) providers.push('deepinfra');
  if (process.env.BASETEN_API_KEY) providers.push('baseten');
  if (process.env.HUGGINGFACE_API_KEY) providers.push('huggingface');

  // Media Providers (for completeness)
  if (process.env.REPLICATE_API_KEY) providers.push('replicate');
  if (process.env.FAL_API_KEY) providers.push('fal');
  if (process.env.LUMA_API_KEY) providers.push('luma');
  if (process.env.ELEVENLABS_API_KEY) providers.push('elevenlabs');
  if (process.env.ASSEMBLYAI_API_KEY) providers.push('assemblyai');
  if (process.env.DEEPGRAM_API_KEY) providers.push('deepgram');
  if (process.env.GLADIA_API_KEY) providers.push('gladia');
  if (process.env.LMNT_API_KEY) providers.push('lmnt');
  if (process.env.HUME_API_KEY) providers.push('hume');
  if (process.env.REVAI_API_KEY) providers.push('revai');

  return providers;
}