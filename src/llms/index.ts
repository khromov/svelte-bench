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
    contextContent?: string
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
 * @param providerName The name of the provider to get
 * @returns The LLM provider
 */
export async function getLLMProvider(
  providerName: string,
  modelId?: string
): Promise<LLMProvider> {
  switch (providerName.toLowerCase()) {
    case "openai":
      const { OpenAIProvider } = await import("./openai");
      return new OpenAIProvider(modelId);
    case "anthropic":
      const { AnthropicProvider } = await import("./anthropic");
      return new AnthropicProvider(modelId);
    case "google":
      const { GoogleGenAIProvider } = await import("./google");
      return new GoogleGenAIProvider(modelId);
    case "openrouter":
      const { OpenRouterProvider } = await import("./openrouter");
      return new OpenRouterProvider(modelId);
    case "ollama":
      const { OllamaProvider } = await import("./ollama");
      return new OllamaProvider(modelId);
    case "z.ai":
      const { ZAIProvider } = await import("./z_ai");
      return new ZAIProvider(modelId);
    default:
      throw new Error(`Unknown LLM provider: ${providerName}`);
  }
}

/**
 * Function to get all available LLM providers
 * @returns Array of available LLM providers with their models
 */
export async function getAllLLMProviders(): Promise<ProviderWithModel[]> {
  const providers: ProviderWithModel[] = [];

  // OpenAI provider
  const openaiProvider = await getLLMProvider("openai");
  for (const modelId of openaiProvider.getModels()) {
    const provider = await getLLMProvider("openai", modelId);
    providers.push({
      provider,
      name: "OpenAI",
      modelId,
    });
  }

  // Anthropic provider
  const anthropicProvider = await getLLMProvider("anthropic");
  for (const modelId of anthropicProvider.getModels()) {
    const provider = await getLLMProvider("anthropic", modelId);
    providers.push({
      provider,
      name: "Anthropic",
      modelId,
    });
  }

  // Google provider
  const googleProvider = await getLLMProvider("google");
  for (const modelId of googleProvider.getModels()) {
    const provider = await getLLMProvider("google", modelId);
    providers.push({
      provider,
      name: "Google",
      modelId,
    });
  }

  // OpenRouter provider
  const openrouterProvider = await getLLMProvider("openrouter");
  for (const modelId of openrouterProvider.getModels()) {
    const provider = await getLLMProvider("openrouter", modelId);
    providers.push({
      provider,
      name: "OpenRouter",
      modelId,
    });
  }

  // Ollama provider
  const ollamaProvider = await getLLMProvider("ollama");
  for (const modelId of ollamaProvider.getModels()) {
    const provider = await getLLMProvider("ollama", modelId);
    providers.push({
      provider,
      name: "Ollama",
      modelId,
    });
  }

  // Z.AI provider
  const zaiProvider = await getLLMProvider("z.ai");
  for (const modelId of zaiProvider.getModels()) {
    const provider = await getLLMProvider("z.ai", modelId);
    providers.push({
      provider,
      name: "Z.AI",
      modelId,
    });
  }

  return providers;
}
