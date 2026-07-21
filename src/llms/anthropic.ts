import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../utils/prompt";
import type { LLMProvider } from "./index";
import { Anthropic } from "@anthropic-ai/sdk";
import { log } from "../utils/tui-events";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private modelId: string;
  name = "Anthropic";

  constructor(modelId?: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    this.client = new Anthropic({ apiKey });
    // Default to claude-3-5-sonnet if no model specified
    this.modelId = modelId || "claude-3-5-sonnet-20241022";
  }

  /**
   * Generate code from a prompt using Anthropic Claude
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
      log(
        `🤖 Generating code with Anthropic using model: ${
          this.modelId
        } (temp: ${temperature ?? "default"})...`
      );

      const systemPrompt = contextContent
        ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT
        : DEFAULT_SYSTEM_PROMPT;

      const promptWithContext = contextContent
        ? `${systemPrompt}\n\n${contextContent}\n\n${prompt}`
        : `${systemPrompt}\n\n${prompt}`;

      const requestOptions: any = {
        model: this.modelId,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptWithContext,
              },
            ],
          },
        ],
      };

      // Only add temperature if it's defined
      if (temperature !== undefined) {
        requestOptions.temperature = temperature;
      }

      const completion = await this.client.messages.create(requestOptions);

      return completion.content[0]?.type === "text"
        ? completion.content[0].text
        : "";
    } catch (error) {
      console.error("Error generating code with Anthropic:", error);
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
