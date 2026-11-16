import OpenAI from "openai";
import type { EasyInputMessage } from "openai/resources/responses/responses";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";

export class QwenProvider implements LLMProvider {
  name = "Qwen";
  private client: OpenAI;
  private modelId: string;

  constructor(modelId = "qwen4-max") {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) throw new Error("QWEN_API_KEY environment variable is required");
    this.modelId = modelId;
    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.QWEN_BASE_URL || "https://us-east-1.maas.qwencloudapi.com/compatible-mode/v1",
      timeout: 5 * 60 * 1000,
    });
  }

  async generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string> {
    const input: EasyInputMessage[] = [
      { role: "system", content: contextContent ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT : DEFAULT_SYSTEM_PROMPT },
    ];
    if (contextContent) input.push({ role: "user", content: contextContent });
    input.push({ role: "user", content: prompt });

    try {
      const response = await this.client.responses.create({
        model: this.modelId,
        input,
        store: false,
        ...(temperature !== undefined ? { temperature } : {}),
      });
      // output_text contains only final-answer text, excluding reasoning items.
      if (response.status !== "completed" || !response.output_text?.trim()) {
        const reason = response.error?.message || response.incomplete_details?.reason || response.status;
        const error = new Error(`Qwen returned no complete code: ${reason ?? "empty answer"}`);
        error.name = "NonRetryableError";
        throw error;
      }
      return response.output_text;
    } catch (error) {
      // Let the SDK handle transient failures; prevent the benchmark retry loop
      // from repeatedly charging or retrying permanent request failures.
      if (error instanceof OpenAI.APIError) {
        const permanentClientError =
          error.status !== undefined &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 408 &&
          error.status !== 409 &&
          error.status !== 429;
        if (permanentClientError || error.headers?.get("x-should-retry") === "false") {
          error.name = "NonRetryableError";
        }
      }
      throw error;
    }
  }

  getModels(): string[] {
    // QwenCloud has no GET /models API. Region/account access is checked at validation.
    return ["qwen4-max", "qwen3.8-max", "qwen3.8-flash", "qwen3.7-plus"];
  }

  getModelIdentifier(): string {
    return this.modelId;
  }
}
