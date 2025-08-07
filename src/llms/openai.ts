import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../utils/prompt";
import type { LLMProvider } from "./index";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private modelId: string;
  name = "OpenAI";
  private readonly availableModels = [
    "chatgpt-4o-latest", //
    "gpt-4.1-2025-04-14", //
    "gpt-4.1-mini-2025-04-14", //
    "gpt-4.1-nano-2025-04-14", //
    "o3-2025-04-16", //
    // ---
    "o4-mini-2025-04-16",
    "o3-mini-2025-01-31",
    "gpt-4o-2024-08-06",
    'gpt-5-2025-08-07',
    'gpt-5-2025-08-07-reasoning-medium'
  ];

  constructor(modelId?: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.client = new OpenAI({ apiKey });
    this.modelId = modelId || this.availableModels[0];
  }

  /**
   * Extract reasoning effort from model name if present
   * @param modelName The model name that may contain reasoning effort suffix
   * @returns Object with clean model name and optional reasoning effort
   */
  private extractReasoningEffort(modelName: string): {
    model: string;
    reasoningEffort?: "low" | "medium" | "high";
  } {
    const reasoningPattern = /-reasoning-(low|medium|high)$/;
    const match = modelName.match(reasoningPattern);
    
    if (match) {
      return {
        model: modelName.replace(reasoningPattern, ""),
        reasoningEffort: match[1] as "low" | "medium" | "high",
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
      
      console.log(
        `🤖 Generating code with OpenAI using model: ${cleanModelId}${reasoningEffort ? ` (reasoning: ${reasoningEffort})` : ''} (temp: ${temperature ?? 'default'})...`
      );

      const systemPrompt = contextContent
        ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT
        : DEFAULT_SYSTEM_PROMPT;

      // Standard chat completions
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
        model: cleanModelId,
        messages: messages,
      };

      // Only add temperature if it's defined and the model supports it
      if (temperature !== undefined && 
          !cleanModelId.startsWith("o4") && 
          !cleanModelId.startsWith("o3")) {
        requestOptions.temperature = temperature;
      }

      // Add reasoning effort if specified (for models that support it)
      if (reasoningEffort) {
        requestOptions.reasoning_effort = reasoningEffort;
      }

      const completion = await this.client.chat.completions.create(requestOptions);

      return completion.choices[0]?.message.content || "";
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
    return [...this.availableModels];
  }

  /**
   * Get the model identifier that was used for generation
   * @returns The model identifier string
   */
  getModelIdentifier(): string {
    return this.modelId;
  }
}
