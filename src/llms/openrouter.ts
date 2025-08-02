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
    "qwen/qwen3-30b-a3b", // x
    "meta-llama/llama-4-maverick", // x
    "meta-llama/llama-4-scout", // x
    "x-ai/grok-3-mini-beta", // x
    "x-ai/grok-3-beta",
    "x-ai/grok-4",
    "moonshotai/kimi-k2",
    "moonshotai/kimi-dev-72b",
    "qwen/qwen3-235b-a22b-07-25",
    "google/gemma-3n-e4b-it",
    "qwen/qwen3-coder",
    "mistralai/devstral-medium",
    "z-ai/glm-4-32b",
    "qwen/qwen3-235b-a22b-thinking-2507",
    "z-ai/glm-4.5",
    "z-ai/glm-4.5-air",
    "qwen/qwen3-30b-a3b-instruct-2507",
    "openrouter/horizon-alpha",
    "x-ai/grok-3",
    "x-ai/grok-3-mini",
    "mistralai/codestral-2508",
    "openrouter/horizon-beta",
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

      // Only add temperature if it's defined
      if (temperature !== undefined) {
        requestOptions.temperature = temperature;
      }

      const completion = await this.client.chat.completions.create(
        requestOptions,
        {
          signal: abortController.signal, // Add abort signal
        },
      );

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
