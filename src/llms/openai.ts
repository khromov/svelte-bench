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
    "o1-pro-2025-03-19",
    // ---
    "o4-mini-2025-04-16",
    "o3-mini-2025-01-31",
    "gpt-4o-2024-08-06",
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
   * Generate code from a prompt using OpenAI
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature parameter for controlling randomness (default: 0.7)
   * @param contextContent Optional context content to include in prompts
   * @returns The generated code
   */
  async generateCode(
    prompt: string,
    temperature: number = 0.7,
    contextContent?: string
  ): Promise<string> {
    try {
      console.log(
        `🤖 Generating code with OpenAI using model: ${this.modelId} (temp: ${temperature})...`
      );

      const systemPrompt = contextContent
        ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT
        : DEFAULT_SYSTEM_PROMPT;
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

      const completion = await this.client.chat.completions.create({
        model: this.modelId,
        messages: messages,
        temperature:
          this.modelId.startsWith("o4") || this.modelId.startsWith("o3")
            ? undefined
            : temperature, // o4, o3 models don't support temperature
      });

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
