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
   * @returns The generated code
   */
  generateCode(
    prompt: string,
    temperature?: number,
    contextContent?: string,
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

  // Use native SDK providers for better feature parity
  // These have special features (reasoning, max_tokens, timeouts, etc.)
  switch (actualProvider.toLowerCase()) {
    case "openai":
      const { OpenAIProvider } = await import("./openai");
      return new OpenAIProvider(actualModel);
    case "anthropic":
      const { AnthropicProvider } = await import("./anthropic");
      return new AnthropicProvider(actualModel);
    case "google":
      const { GoogleGenAIProvider } = await import("./google");
      return new GoogleGenAIProvider(actualModel);
    case "openrouter":
      const { OpenRouterProvider } = await import("./openrouter");
      return new OpenRouterProvider(actualModel);
    case "fireworks":
      const { FireworksProvider } = await import("./fireworks");
      return new FireworksProvider(actualModel);
    case "ollama":
      const { OllamaProvider } = await import("./ollama");
      return new OllamaProvider(actualModel);
    case "zai":
      const { ZAIProvider } = await import("./zai");
      return new ZAIProvider(actualModel);
    case "moonshot":
      const { MoonshotProvider } = await import("./moonshot");
      return new MoonshotProvider(actualModel);
    case "xai":
      const { XAIProvider } = await import("./xai");
      return new XAIProvider(actualModel);
    case "meta":
      const { MetaProvider } = await import("./meta");
      return new MetaProvider(actualModel);
    case "minimax":
      const { MiniMaxProvider } = await import("./minimax");
      return new MiniMaxProvider(actualModel);
    case "cursor":
      const { CursorProvider } = await import("./cursor");
      return new CursorProvider(actualModel);
  }

  // Provider not found
  throw new Error(
    `Unknown LLM provider: ${actualProvider}. ` +
    `Native providers: openai, anthropic, google, openrouter, fireworks, ollama, zai, moonshot, xai, meta, minimax, cursor.`
  );
}

/**
 * Function to get all available LLM providers
 * @returns Array of available LLM providers with their models
 *
 * Returns providers from the native provider implementations.
 */
export async function getAllLLMProviders(): Promise<ProviderWithModel[]> {
  const providers: ProviderWithModel[] = [];

  const nativeProviders = [
    { name: "openai", displayName: "OpenAI" },
    { name: "anthropic", displayName: "Anthropic" },
    { name: "google", displayName: "Google" },
    { name: "openrouter", displayName: "OpenRouter" },
    { name: "fireworks", displayName: "Fireworks" },
    { name: "ollama", displayName: "Ollama" },
    { name: "zai", displayName: "Z.ai" },
    { name: "moonshot", displayName: "Moonshot AI" },
    { name: "xai", displayName: "xAI" },
    { name: "meta", displayName: "Meta" },
    { name: "minimax", displayName: "MiniMax" },
    { name: "cursor", displayName: "Cursor" },
  ];

  for (const { name, displayName } of nativeProviders) {
    try {
      const nativeProvider = await getLLMProvider(name, "default");
      for (const modelId of nativeProvider.getModels()) {
        const provider = await getLLMProvider(name, modelId);
        providers.push({
          provider,
          name: displayName,
          modelId,
        });
      }
    } catch {
      // Provider not configured, skip it.
    }
  }

  return providers;
}
