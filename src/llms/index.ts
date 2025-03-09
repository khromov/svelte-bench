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
   * @returns The generated code
   */
  generateCode(prompt: string): Promise<string>;

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

  return providers;
}
