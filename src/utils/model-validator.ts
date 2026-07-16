import { getLLMProvider } from "../llms";

/**
 * Validates if a model exists for a given provider by making a minimal API call
 * @param provider The LLM provider name
 * @param model The model identifier to validate
 * @returns true if model is valid, false otherwise
 */
export async function validateModel(provider: string, model: string): Promise<boolean> {
  const simplePrompt = "Return the word 'test'";

  try {
    // Get the provider instance with the specified model
    const llmProvider = await getLLMProvider(provider, model);

    // Make a minimal API call to validate model
    await llmProvider.generateCode(simplePrompt, 0.1);
    return true;
  } catch (error: any) {
    // Check for model not found errors
    if (
      error.message?.includes("does not exist") ||
      error.message?.includes("not found") ||
      error.message?.includes("model must be") ||
      error.status === 404 ||
      error.status === 400
    ) {
      console.error(`Invalid model '${model}' for provider ${provider}: ${error.message}`);
      return false;
    }

    // For other errors (network, auth), throw them up
    console.error(`Validation error for ${provider}/${model}:`, error.message);
    throw error;
  }
}

/**
 * Validates multiple models for a provider
 * @param provider The LLM provider name
 * @param models Array of model identifiers to validate
 * @returns Array of valid model names
 */
export async function validateModels(provider: string, models: string[]): Promise<string[]> {
  const validModels: string[] = [];

  for (const model of models) {
    try {
      const isValid = await validateModel(provider, model);
      if (isValid) {
        validModels.push(model);
        console.log(`✓ Model ${model} is valid for ${provider}`);
      } else {
        console.log(`✗ Model ${model} is not available for ${provider}`);
      }
    } catch (error) {
      console.error(`Failed to validate ${model} for ${provider}:`, error);
    }
  }

  return validModels;
}
