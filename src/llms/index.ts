/**
 * Interface for LLM providers
 * Defines the common functionality that all LLM providers must implement
 */
export interface LLMProvider {
  /**
   * Name of the LLM provider
   */
  name: string;

  /**
   * Generate code from a prompt
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature parameter for controlling randomness
   * @param contextContent Optional context content to include in the prompt
   * @param enableMCP Optional flag to enable MCP tools
   * @returns The generated code
   */
  generateCode(
    prompt: string,
    temperature?: number,
    contextContent?: string,
    enableMCP?: boolean,
  ): Promise<string>;

  /**
   * Get all available models for this provider
   * @returns Array of model identifiers
   */
  getModels(): string[];

  /**
   * Get the model identifier that was used for generation
   * @returns The model identifier string
   */
  getModelIdentifier(): string;
}

/**
 * Provider with model information
 * Extends LLMProvider with additional information about the model
 */
export interface ProviderWithModel {
  provider: LLMProvider;
  name: string;
  modelId: string;
}

/**
 * Factory function to get an LLM provider by name
 * @param providerName The name of the provider to get (or "provider:model" format)
 * @param modelId The model identifier (optional if using "provider:model" format)
 * @returns The LLM provider
 */
export async function getLLMProvider(
  providerName: string,
  modelId?: string,
): Promise<LLMProvider> {
  // Parse provider:model format if provided
  let actualProvider = providerName;
  let actualModel = modelId;

  if (providerName.includes(':') && !modelId) {
    const [provider, model] = providerName.split(':', 2);
    actualProvider = provider;
    actualModel = model;
  }

  // Ensure model ID is provided
  if (!actualModel) {
    throw new Error(
      `Model ID is required. Use either getLLMProvider('provider', 'model') or getLLMProvider('provider:model')`
    );
  }

  // Try AI SDK unified registry first for all official providers
  const { getAvailableProviders } = await import("./ai-sdk/unified-registry");
  const { AISDKProviderWrapper } = await import("./ai-sdk/base-provider");

  const availableProviders = getAvailableProviders();
  if (availableProviders.includes(actualProvider.toLowerCase())) {
    return new AISDKProviderWrapper(actualProvider.toLowerCase(), actualModel);
  }

  // Fallback to legacy native SDK providers (for reference/special cases)
  // These legacy providers are maintained for backward compatibility only
  switch (actualProvider.toLowerCase()) {
    case "openai":
      const { LEGACY_OpenAIProvider } = await import("./openai");
      return new LEGACY_OpenAIProvider(actualModel);
    case "anthropic":
      const { LEGACY_AnthropicProvider } = await import("./anthropic");
      return new LEGACY_AnthropicProvider(actualModel);
    case "google":
      const { LEGACY_GoogleGenAIProvider } = await import("./google");
      return new LEGACY_GoogleGenAIProvider(actualModel);
    case "openrouter":
      const { LEGACY_OpenRouterProvider } = await import("./openrouter");
      return new LEGACY_OpenRouterProvider(actualModel);
    case "ollama":
      const { LEGACY_OllamaProvider } = await import("./ollama");
      return new LEGACY_OllamaProvider(actualModel);
    case "zai":
      const { LEGACY_ZAIProvider } = await import("./zai");
      return new LEGACY_ZAIProvider(actualModel);
    case "moonshot":
      const { LEGACY_MoonshotProvider } = await import("./moonshot");
      return new LEGACY_MoonshotProvider(actualModel);
  }

  // Provider not found
  throw new Error(
    `Unknown LLM provider: ${actualProvider}. ` +
    `Available AI SDK providers: ${availableProviders.join(', ')}. ` +
    `Legacy providers (deprecated): openai, anthropic, google, openrouter, ollama, zai, moonshot.`
  );
}

/**
 * Function to get all available LLM providers
 * @returns Array of available LLM providers with their models
 *
 * Note: This function primarily returns legacy providers for compatibility.
 * All new usage should route through AI SDK unified registry instead.
 * Individual models must be specified by the user in DEBUG_MODE.
 */
export async function getAllLLMProviders(): Promise<ProviderWithModel[]> {
  const providers: ProviderWithModel[] = [];

  // Get AI SDK providers from unified registry
  const { getAvailableProviders } = await import("./ai-sdk/unified-registry");
  const availableProviders = getAvailableProviders();

  console.log(`📋 Found ${availableProviders.length} available AI SDK providers:`, availableProviders.join(', '));

  // Legacy providers (maintained for backward compatibility only)
  const legacyProviders = [
    { name: "openai", displayName: "OpenAI (Legacy)" },
    { name: "anthropic", displayName: "Anthropic (Legacy)" },
    { name: "google", displayName: "Google (Legacy)" },
    { name: "openrouter", displayName: "OpenRouter (Legacy)" },
    { name: "ollama", displayName: "Ollama (Legacy)" },
    { name: "zai", displayName: "Z.ai (Legacy)" },
    { name: "moonshot", displayName: "Moonshot AI (Legacy)" },
  ];

  for (const { name, displayName } of legacyProviders) {
    try {
      const legacyProvider = await getLLMProvider(name, "default");
      for (const modelId of legacyProvider.getModels()) {
        const provider = await getLLMProvider(name, modelId);
        providers.push({
          provider,
          name: displayName,
          modelId,
        });
      }
    } catch (error) {
      // Provider not configured, skip
    }
  }

  // Note: AI SDK providers don't expose model lists by default
  // Models must be specified explicitly in DEBUG_MODE

  return providers;
}
