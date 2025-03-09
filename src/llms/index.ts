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
}

/**
 * Factory function to get an LLM provider by name
 * @param providerName The name of the provider to get
 * @returns The LLM provider
 */
export async function getLLMProvider(
  providerName: string
): Promise<LLMProvider> {
  switch (providerName.toLowerCase()) {
    case "openai":
      const { OpenAIProvider } = await import("./openai");
      return new OpenAIProvider();
    default:
      throw new Error(`Unknown LLM provider: ${providerName}`);
  }
}
