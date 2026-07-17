import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";
import { withRetry } from "../utils/retry-wrapper";

interface MiniMaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MiniMaxResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

export class MiniMaxProvider implements LLMProvider {
  private apiKey: string;
  private modelId: string;
  name = "MiniMax";
  private readonly availableModels = ["MiniMax-M2.5", "MiniMax-M2.5-highspeed"];

  constructor(modelId?: string) {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      throw new Error("MINIMAX_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
    this.modelId = modelId || this.availableModels[0];
  }

  async generateCode(prompt: string, _temperature?: number, contextContent?: string): Promise<string> {
    console.log(`🤖 Generating code with MiniMax using model: ${this.modelId}...`);

    const systemPrompt = contextContent ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT : DEFAULT_SYSTEM_PROMPT;
    const messages: MiniMaxMessage[] = [{ role: "system", content: systemPrompt }];

    if (contextContent) {
      messages.push({ role: "user", content: contextContent });
    }

    messages.push({ role: "user", content: prompt });

    return withRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2 * 60 * 1000);

        try {
          const response = await fetch("https://api.minimax.io/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: this.modelId,
              messages,
              max_completion_tokens: 8192,
              stream: false,
            }),
            signal: controller.signal,
          });

          const responseText = await response.text();
          let data: MiniMaxResponse;
          try {
            data = JSON.parse(responseText) as MiniMaxResponse;
          } catch {
            data = {};
          }

          if (!response.ok) {
            const errorMessage = data.base_resp?.status_msg || responseText;
            if (response.status === 429 || response.status >= 500) {
              throw new Error(`MiniMax API temporary error: ${response.status} ${errorMessage}`);
            }
            const error = new Error(`MiniMax API request failed: ${response.status} ${errorMessage}`);
            error.name = "NonRetryableError";
            throw error;
          }

          const content = data.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error(
              `MiniMax returned an empty response${data.base_resp?.status_msg ? `: ${data.base_resp.status_msg}` : ""}`,
            );
          }

          return content;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error(`MiniMax request timed out after 2 minutes: ${this.modelId}`);
          }
          throw error;
        } finally {
          clearTimeout(timeoutId);
        }
      },
      {
        maxAttempts: 10,
        initialDelayMs: 2000,
        maxDelayMs: 60000,
        backoffFactor: 2,
        onRetry: (error, attempt) => {
          console.warn(`⚠️  MiniMax retry attempt ${attempt}/10 for model ${this.modelId}: ${error.message}`);
        },
      },
    );
  }

  getModels(): string[] {
    return [...this.availableModels];
  }

  getModelIdentifier(): string {
    return this.modelId;
  }
}
