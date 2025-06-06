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
    temperature?: number,
    contextContent?: string
  ): Promise<string> {
    try {
      console.log(
        `🤖 Generating code with OpenAI using model: ${this.modelId} (temp: ${temperature ?? 'default'})...`
      );

      const systemPrompt = contextContent
        ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT
        : DEFAULT_SYSTEM_PROMPT;

      // Special handling for o1-pro model which requires responses endpoint
      if (this.modelId.startsWith("o1-pro")) {
        console.log("Using responses endpoint for o1-pro model");

        const combinedPrompt = contextContent
          ? `${systemPrompt}\n\n${contextContent}\n\n${prompt}`
          : `${systemPrompt}\n\n${prompt}`;

        const response = await this.client.responses.create({
          model: this.modelId,
          input: [
            {
              role: "developer",
              content: [
                {
                  type: "input_text",
                  text: combinedPrompt,
                },
              ],
            },
          ],
          text: {
            format: {
              type: "text",
            },
          },
          reasoning: {
            effort: "medium",
          },
          tools: [],
          store: false,
        });

        console.log("we received a response:", response.output_text);

        return response.output_text || "";
      }

      // Standard chat completions for other models
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

      // Only add temperature if it's defined and the model supports it
      if (temperature !== undefined && 
          !this.modelId.startsWith("o4") && 
          !this.modelId.startsWith("o3")) {
        requestOptions.temperature = temperature;
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
