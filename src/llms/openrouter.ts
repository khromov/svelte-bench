import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../utils/prompt";
import type { LLMProvider } from "./index";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class LEGACY_OpenRouterProvider implements LLMProvider {
  private client: OpenAI;
  private modelId: string;
  name = "OpenRouter";

  constructor(modelId?: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        /*
        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL ||
          "https://github.com/khromov/svelte-bench",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "SvelteBench",
        */
      },
    });

    // Default to a commonly available model if no model specified
    this.modelId = modelId || "openai/gpt-4o";
  }

  /**
   * Generate code from a prompt using OpenRouter
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature parameter for controlling randomness (default: 0.7)
   * @param contextContent Optional context content to include in prompts
   * @returns The generated code
   */
  async generateCode(
    prompt: string,
    temperature?: number,
    contextContent?: string,
  ): Promise<string> {
    // Create AbortController with 5-minute timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => {
        abortController.abort();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    try {
      console.log(
        `🤖 Generating code with OpenRouter using model: ${
          this.modelId
        } (temp: ${temperature ?? "default"})...`,
      );

      const systemPrompt = contextContent
        ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT
        : DEFAULT_SYSTEM_PROMPT;

      // Standard chat completions for OpenRouter models
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: systemPrompt,
        },
      ];

      // Add context message if available
      if (contextContent) {
        messages.push({
          role: "user",
          content: contextContent,
        });
      }

      // Add the main prompt
      messages.push({
        role: "user",
        content: prompt,
      });

      const requestOptions: any = {
        model: this.modelId,
        messages: messages,
      };

      // Add provider routing preferences if configured
      const openrouterProvider = process.env.OPENROUTER_PROVIDER;
      if (openrouterProvider && openrouterProvider.toLowerCase() !== 'auto') {
        requestOptions.provider = { only: [openrouterProvider] };
      } else {
        // Apply quantization filtering for precision requirements
        requestOptions.provider = this.buildProviderConfig();
      }

      // Only add temperature if it's defined
      if (temperature !== undefined) {
        requestOptions.temperature = temperature;
      }

      let completion;
      try {
        completion = await this.client.chat.completions.create(
          requestOptions,
          {
            signal: abortController.signal, // Add abort signal
          },
        );
      } catch (quantizationError) {
        // If no providers match the quantization requirements, fall back to default
        if (this.isQuantizationError(quantizationError)) {
          console.warn(
            "⚠️  WARNING: NO MODELS FOUND WITH REQUIRED PRECISION (bf16+). FALLING BACK TO DEFAULT MODEL WITHOUT QUANTIZATION FILTERING.",
          );
          
          // Retry without quantization filtering
          const fallbackOptions = { ...requestOptions };
          if (openrouterProvider && openrouterProvider.toLowerCase() !== 'auto') {
            fallbackOptions.provider = { only: [openrouterProvider] };
          } else {
            delete fallbackOptions.provider;
          }
          
          completion = await this.client.chat.completions.create(
            fallbackOptions,
            {
              signal: abortController.signal,
            },
          );
        } else {
          throw quantizationError;
        }
      }

      // Clear timeout on successful completion
      clearTimeout(timeoutId);

      return completion.choices[0]?.message.content || "";
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);

      // Check if the error is due to abort (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        console.error(
          `OpenRouter API call timed out after 5 minutes for model: ${this.modelId}`,
        );
        throw new Error(`Request timed out after 5 minutes: ${this.modelId}`);
      }

      console.error("Error generating code with OpenRouter:", error);
      throw new Error(
        `Failed to generate code: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Get all available models for this provider
   * @returns Array of model identifiers
   */
  getModels(): string[] {
    // Return empty array since models are now dynamically validated
    return [];
  }

  /**
   * Get the model identifier that was used for generation
   * @returns The model identifier string
   */
  getModelIdentifier(): string {
    return this.modelId;
  }

  /**
   * Build provider configuration with quantization filtering
   * @returns Provider configuration object
   */
  private buildProviderConfig(): any {
    // Disallow low precision quantizations, allow unknown for flexibility
    const disallowedQuantizations = ['fp4', 'fp6', 'fp8', 'int4', 'int8'];
    
    return {
      disallow_quantizations: disallowedQuantizations,
      // Allow unknown quantization to handle cases where precision is not specified
      allow_fallbacks: true
    };
  }

  /**
   * Check if an error is related to quantization/provider filtering
   * @param error The error to check
   * @returns True if the error is related to quantization filtering
   */
  private isQuantizationError(error: any): boolean {
    if (!(error instanceof Error)) return false;
    
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('no providers') ||
      errorMessage.includes('quantization') ||
      errorMessage.includes('provider') ||
      errorMessage.includes('precision') ||
      errorMessage.includes('not available') ||
      errorMessage.includes('no models found')
    );
  }
}
