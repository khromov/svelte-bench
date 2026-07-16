import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class FireworksProvider implements LLMProvider {
  private client: OpenAI;
  private modelId: string;
  name = "Fireworks";

  constructor(modelId?: string) {
    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) {
      throw new Error("FIREWORKS_API_KEY environment variable is required");
    }

    this.client = new OpenAI({
      baseURL: "https://api.fireworks.ai/inference/v1",
      apiKey,
    });

    this.modelId = modelId || "accounts/fireworks/models/inkling";
  }

  async generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5 * 60 * 1000);

    try {
      console.log(
        `🤖 Generating code with Fireworks using model: ${this.modelId} (temp: ${temperature ?? "default"})...`,
      );

      const systemPrompt = contextContent ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT : DEFAULT_SYSTEM_PROMPT;
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ];

      if (contextContent) {
        messages.push({ role: "user", content: contextContent });
      }

      messages.push({ role: "user", content: prompt });

      const requestOptions: any = {
        model: this.modelId,
        messages,
      };

      if (temperature !== undefined) {
        requestOptions.temperature = temperature;
      }

      const completion = await this.client.chat.completions.create(requestOptions, {
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);
      return completion.choices[0]?.message.content || "";
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        console.error(`Fireworks API call timed out after 5 minutes for model: ${this.modelId}`);
        throw new Error(`Request timed out after 5 minutes: ${this.modelId}`);
      }

      console.error("Error generating code with Fireworks:", error);
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getModels(): string[] {
    return ["accounts/fireworks/models/inkling"];
  }

  getModelIdentifier(): string {
    return this.modelId;
  }
}
