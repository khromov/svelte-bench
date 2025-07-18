import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../utils/prompt";
import type { LLMProvider } from "./index";
import { Anthropic } from "@anthropic-ai/sdk";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private modelId: string;
  name = "Anthropic";
  private readonly availableModels = [
    "claude-opus-4-20250514",
    "claude-sonnet-4-20250514",
    "claude-3-7-sonnet-20250219",
    // "claude-3-5-sonnet-20241022", // 3.5 v2
    // "claude-3-5-sonnet-20240620", // 3.5
    "claude-3-5-haiku-20241022",
    //  "claude-3-opus-20240229", <- no point testing old models
  ];

  constructor(modelId?: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    this.client = new Anthropic({ apiKey });
    this.modelId = modelId || this.availableModels[0];
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
      console.log(
        `🤖 Generating code with Anthropic using model: ${this.modelId} (temp: ${temperature ?? 'default'})...`
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

      return completion.content[0]?.text || "";
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
