import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";

export class ReflectionProvider implements LLMProvider {
  name = "Reflection";
  private client: OpenAI;
  private modelId: string;

  constructor(modelId = "Beam-1.0-501B-A23B") {
    const apiKey = process.env.REFLECTION_API_KEY;
    if (!apiKey) {
      throw new Error("REFLECTION_API_KEY environment variable is required");
    }
    this.modelId = modelId;
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.reflection.ai/openai/v1",
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
      const completion = await this.client.chat.completions.create({
        model: this.modelId,
        messages,
        max_completion_tokens: 8192,
        ...(temperature !== undefined ? { temperature } : {}),
      });
      const choice = completion.choices[0];
      const content = choice?.message.content;
      if (!content?.trim()) {
        const reason =
          choice?.finish_reason === "length"
            ? "output token budget exhausted during reasoning before an answer was returned"
            : `empty answer (finish_reason: ${choice?.finish_reason ?? "missing"})`;
        const error = new Error(`Reflection returned no code: ${reason}`);
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
          !(error.status === 409 && error.code === "tier_switch_pending");
        if (retryForbidden || permanentClientError) {
          error.name = "NonRetryableError";
        }
      }
      throw error;
    }
  }

  getModels(): string[] {
    return ["Beam-1.0-501B-A23B"];
  }

  getModelIdentifier(): string {
    return this.modelId;
  }
}
