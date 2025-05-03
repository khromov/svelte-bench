import { DEFAULT_SYSTEM_PROMPT } from "../utils/prompt";
import type { LLMProvider } from "./index";
import OpenAI from "openai";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private modelId: string;
  name = "OpenAI";
  private readonly availableModels = [
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
   * @returns The generated code
   */
  async generateCode(
    prompt: string,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      console.log(
        `🤖 Generating code with OpenAI using model: ${this.modelId} (temp: ${temperature})...`
      );

      const completion = await this.client.chat.completions.create({
        model: this.modelId,
        messages: [
          {
            role: "system",
            content: DEFAULT_SYSTEM_PROMPT,
          },
          { role: "user", content: prompt },
        ],
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
