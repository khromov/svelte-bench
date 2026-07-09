import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class MetaProvider implements LLMProvider {
  private client: OpenAI;
  private modelId: string;
  name = "Meta";

  constructor(modelId?: string) {
    const apiKey = process.env.META_API_KEY;
    if (!apiKey) {
      throw new Error("META_API_KEY environment variable is required");
    }

    this.client = new OpenAI({
      baseURL: "https://api.meta.ai/v1",
      apiKey: apiKey,
    });

    // Default to muse-spark-1.1 if no model specified
    this.modelId = modelId || "muse-spark-1.1";
  }

  /**
   * Generate code from a prompt using Meta
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature parameter for controlling randomness (default: 0.7)
   * @param contextContent Optional context content to include in prompts
   * @returns The generated code
   */
  async generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string> {
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
        `🤖 Generating code with Meta using model: ${this.modelId} (temp: ${temperature ?? "default"})...`,
      );

      const systemPrompt = contextContent ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT : DEFAULT_SYSTEM_PROMPT;

      // Standard chat completions for Meta models
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

      const completion = await this.client.chat.completions.create(requestOptions, {
        signal: abortController.signal, // Add abort signal
      });

      // Clear timeout on successful completion
      clearTimeout(timeoutId);

      return completion.choices[0]?.message.content || "";
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);

      // Check if the error is due to abort (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        console.error(`Meta API call timed out after 5 minutes for model: ${this.modelId}`);
        throw new Error(`Request timed out after 5 minutes: ${this.modelId}`);
      }

      console.error("Error generating code with Meta:", error);
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all available models for this provider
   * @returns Array of model identifiers
   */
  getModels(): string[] {
    return ["muse-spark-1.1"];
  }

  /**
   * Get the model identifier that was used for generation
   * @returns The model identifier string
   */
  getModelIdentifier(): string {
    return this.modelId;
  }
}
