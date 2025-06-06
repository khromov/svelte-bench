import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../utils/prompt";
import type { LLMProvider } from "./index";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class OpenRouterProvider implements LLMProvider {
  private client: OpenAI;
  private modelId: string;
  name = "OpenRouter";
  private readonly availableModels = [
    "mistralai/devstral-small", // x
    "mistralai/mistral-medium-3", // x
    "deepseek/deepseek-r1-0528", // x
    "qwen/qwen3-30b-a3b",
    "meta-llama/llama-4-maverick",
    "meta-llama/llama-4-scout",
    "x-ai/grok-3-mini-beta",
    "x-ai/grok-3-beta",
  ];

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

    this.modelId = modelId || this.availableModels[0];
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
    contextContent?: string
  ): Promise<string> {
    try {
      console.log(
        `🤖 Generating code with OpenRouter using model: ${this.modelId} (temp: ${temperature ?? 'default'})...`
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

      // Only add temperature if it's defined
      if (temperature !== undefined) {
        requestOptions.temperature = temperature;
      }

      const completion = await this.client.chat.completions.create(requestOptions);

      return completion.choices[0]?.message.content || "";
    } catch (error) {
      console.error("Error generating code with OpenRouter:", error);
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
