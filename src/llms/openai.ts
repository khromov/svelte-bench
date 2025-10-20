import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../utils/prompt";
import type { LLMProvider } from "./index";
import OpenAI from "openai";
import type {
  EasyInputMessage,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";
import type { ReasoningEffort } from "openai/resources/shared";

export class LEGACY_OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private modelId: string;
  name = "OpenAI";

  constructor(modelId?: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.client = new OpenAI({ apiKey });
    // Default to gpt-4o if no model specified
    this.modelId = modelId || "gpt-4o-2024-08-06";
  }

  /**
   * Extract reasoning effort from model name if present
   * @param modelName The model name that may contain reasoning effort suffix
   * @returns Object with clean model name and optional reasoning effort
   */
  private extractReasoningEffort(modelName: string): {
    model: string;
    reasoningEffort?: Exclude<ReasoningEffort, null>;
  } {
    const reasoningPattern = /-reasoning-(minimal|low|medium|high)$/;
    const match = modelName.match(reasoningPattern);
    
    if (match) {
      return {
        model: modelName.replace(reasoningPattern, ""),
        reasoningEffort: match[1] as Exclude<ReasoningEffort, null>,
      };
    }
    
    return { model: modelName };
  }

  /**
   * Generate code from a prompt using OpenAI
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature parameter for controlling randomness (default: 0.7)
   * @param contextContent Optional context content to include in prompts
   * @returns The generated code
   */
  async generateCode(
    prompt: string,
    temperature?: number,
    contextContent?: string
  ): Promise<string> {
    try {
      // Extract reasoning effort from model name if present
      const { model: cleanModelId, reasoningEffort } = this.extractReasoningEffort(this.modelId);
      
      // Check if the model supports temperature
      const supportsTemperature = !cleanModelId.startsWith("o4") && 
                                  !cleanModelId.startsWith("o3") && 
                                  !cleanModelId.startsWith("gpt-5");
      
      // Build the log message
      let logMessage = `🤖 Generating code with OpenAI using model: ${cleanModelId}`;
      if (reasoningEffort) {
        logMessage += ` (reasoning: ${reasoningEffort})`;
      }
      if (supportsTemperature && temperature !== undefined) {
        logMessage += ` (temp: ${temperature})`;
      } else if (supportsTemperature) {
        logMessage += ` (temp: default)`;
      }
      logMessage += `...`;
      
      console.log(logMessage);

      const systemPrompt = contextContent
        ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT
        : DEFAULT_SYSTEM_PROMPT;

      // Standard chat completions
      const inputMessages: EasyInputMessage[] = [
        {
          role: "system",
          content: systemPrompt,
        },
      ];

      // Add context message if available
      if (contextContent) {
        inputMessages.push({
          role: "user",
          content: contextContent,
        });
      }

      // Add the main prompt
      inputMessages.push({
        role: "user",
        content: prompt,
      });

      const requestOptions: ResponseCreateParamsNonStreaming = {
        model: cleanModelId,
        input: inputMessages,
      };

      // Only add temperature if it's defined and the model supports it
      if (temperature !== undefined && supportsTemperature) {
        requestOptions.temperature = temperature;
      }

      // Add reasoning effort if specified (for models that support it)
      if (reasoningEffort) {
        requestOptions.reasoning = {
          effort: reasoningEffort,
        };
      }

      const response = await this.client.responses.create(requestOptions);

      return response.output_text;
    } catch (error) {
      console.error("Error generating code with OpenAI:", error);
      throw new Error(
        `Failed to generate code: ${
          error instanceof Error ? error.message : String(error)
        }`
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
}
