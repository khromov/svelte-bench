import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";
import { withRetry } from "../utils/retry-wrapper";

interface MiniMaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MiniMaxResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string | null;
    };
  }>;
  error?: { message?: string };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

export class MiniMaxProvider implements LLMProvider {
  private apiKey: string;
  private modelId: string;
  name = "MiniMax";
  private readonly availableModels = [
    "MiniMax-M3.1-Flash",
    "MiniMax-M3",
    "MiniMax-M2.7",
    "MiniMax-M2.7-highspeed",
    "MiniMax-M2.5",
    "MiniMax-M2.5-highspeed",
    "MiniMax-M2.1",
    "MiniMax-M2.1-highspeed",
    "MiniMax-M2",
  ];

  constructor(modelId?: string) {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      throw new Error("MINIMAX_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
    this.modelId = modelId || this.availableModels[0];
  }

  async generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string> {
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
              reasoning_split: true,
              ...(temperature !== undefined ? { temperature } : {}),
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
            const errorMessage = data.base_resp?.status_msg || data.error?.message || responseText;
            if (response.status === 429 || response.status >= 500) {
              throw new Error(`MiniMax API temporary error: ${response.status} ${errorMessage}`);
            }
            const error = new Error(`MiniMax API request failed: ${response.status} ${errorMessage}`);
            error.name = "NonRetryableError";
            throw error;
          }

          // MiniMax can report API errors inside an HTTP 200 response.
          const code = data.base_resp?.status_code;
          if (code) {
            const error = new Error(`MiniMax API error ${code}: ${data.base_resp?.status_msg || "unknown error"}`);
            if (![1000, 1001, 1002, 1024, 1033, 1039, 1041, 2045].includes(code)) {
              error.name = "NonRetryableError";
            }
            throw error;
          }

          const choice = data.choices?.[0];
          const content = choice?.message?.content;
          if (!content?.trim()) {
            const reason =
              choice?.finish_reason === "length"
                ? "output token budget exhausted during reasoning before an answer was returned"
                : "empty response";
            const error = new Error(`MiniMax returned no code: ${reason}`);
            error.name = "NonRetryableError";
            throw error;
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
