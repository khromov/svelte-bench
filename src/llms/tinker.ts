import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";

export class TinkerProvider implements LLMProvider {
  name = "Thinking Machines Tinker";
  private client: OpenAI;
  private modelId: string;

  constructor(modelId: string) {
    const apiKey = process.env.TM_TINKER_API_KEY;
    if (!apiKey) {
      throw new Error("TM_TINKER_API_KEY environment variable is required");
    }
    this.modelId = modelId;
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1",
      timeout: 5 * 60 * 1000,
    });
  }

  async generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: contextContent ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT : DEFAULT_SYSTEM_PROMPT },
    ];
    if (contextContent) {
      messages.push({ role: "user", content: contextContent });
    }
    messages.push({ role: "user", content: prompt });

    try {
      // The SDK handles transient errors, Retry-After, and x-should-retry.
      const request: ChatCompletionCreateParamsNonStreaming & { separate_reasoning: boolean } = {
        model: this.modelId,
        messages,
        max_tokens: 8192,
        separate_reasoning: true,
        ...(temperature !== undefined ? { temperature } : {}),
      };
      const completion = await this.client.chat.completions.create(request);
      const choice = completion.choices[0];
      const content = choice?.message.content;
      if (!content?.trim()) {
        const reason =
          choice?.finish_reason === "length"
            ? "output token budget exhausted during reasoning before an answer was returned"
            : `empty answer (finish_reason: ${choice?.finish_reason ?? "missing"})`;
        const error = new Error(`Tinker returned no code: ${reason}`);
        error.name = "NonRetryableError";
        throw error;
      }
      return content;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const retryForbidden = error.headers?.get("x-should-retry") === "false";
        const permanentClientError =
          error.status !== undefined &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429 &&
          error.status !== 409;
        if (retryForbidden || permanentClientError) {
          error.name = "NonRetryableError";
        }
      }
      throw error;
    }
  }

  async getModels(): Promise<string[]> {
    // Tinker publishes these as its stable, machine-readable catalog contract.
    // Both base model IDs and serverless sampling variants work as model names.
    const catalogs = await Promise.all(
      ["models", "serverless"].map(async (catalog) => {
        const response = await fetch(`https://tinker-docs.thinkingmachines.ai/tinker/${catalog}.json`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`Tinker catalog returned status ${response.status}`);
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid Tinker model catalog");
        return data.flatMap((item) =>
          typeof item?.tinker_id === "string" && item.tinker_id.trim() ? [item.tinker_id] : [],
        );
      }),
    );
    const models = [...new Set(catalogs.flat())];
    if (!models.length) throw new Error("Tinker catalog returned no models");
    return models;
  }

  getModelIdentifier(): string {
    return this.modelId;
  }
}
