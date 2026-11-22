import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";
import { withRetry } from "../utils/retry-wrapper";

export class ZAIProvider implements LLMProvider {
  private apiKey: string;
  private modelId: string;
  name = "Z.ai";
  private readonly availableModels = [
    "glm-4.5", // x
    "glm-4.5-air", // x
    "glm-4.5-x",
    "glm-4.5-airx",
    "glm-4.5-flash",
    "glm-4-32b-0414-128k",
    "glm-4.6",
  ];

  constructor(modelId?: string) {
    const apiKey = process.env.Z_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Z_AI_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
    this.modelId = modelId || this.availableModels[0];
  }

  /**
   * Generate code from a prompt using Z.ai
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature parameter for controlling randomness (default: 0.7)
   * @param contextContent Optional context content to include in prompts
   * @returns The generated code
   */
  async generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string> {
    console.log(`🤖 Generating code with Z.ai using model: ${this.modelId} (temp: ${temperature ?? "default"})...`);

    const systemPrompt = contextContent ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT : DEFAULT_SYSTEM_PROMPT;

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    if (contextContent) {
      messages.push({
        role: "user",
        content: contextContent,
      });
    }

    messages.push({
      role: "user",
      content: prompt,
    });

    const requestBody: any = {
      model: this.modelId,
      messages: messages,
    };

    if (temperature !== undefined) {
      requestBody.temperature = temperature;
    }

    // Wrap the API call in retry logic with custom settings for z.ai
    return await withRetry(
      async () => {
        // Create AbortController for timeout (2 minutes for z.ai models)
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => {
            controller.abort();
          },
          2 * 60 * 1000,
        ); // 2 minutes

        try {
          const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const data = await response.json().catch((error) => {
            if (response.ok) throw error;
            return null;
          });
          if (!response.ok || data?.error) {
            const detail = data?.error?.message || response.statusText;
            const error = new Error(`Z.ai API HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
              error.name = "NonRetryableError";
            }
            throw error;
          }
          const content = data.choices?.[0]?.message?.content;

          if (!content) {
            throw new Error("Z.ai returned empty response");
          }

          return content;
        } catch (error) {
          clearTimeout(timeoutId);

          // Check if it's an abort error (timeout)
          if (error instanceof Error && error.name === "AbortError") {
            console.error(`Z.ai request timed out after 2 minutes for model: ${this.modelId}`);
            throw new Error(`Request timed out after 2 minutes: ${this.modelId}`);
          }

          throw error;
        }
      },
      {
        maxAttempts: 10,
        initialDelayMs: 2000, // Start with 2 seconds for z.ai
        maxDelayMs: 60000, // Max 1 minute between retries
        backoffFactor: 2,
        onRetry: (error, attempt) => {
          console.warn(`⚠️  Z.ai retry attempt ${attempt}/10 for model ${this.modelId} after error: ${error.message}`);
        },
      },
    ).catch((error) => {
      // The provider already retried the request. Let the benchmark report the failure.
      const finalError = error instanceof Error ? error : new Error(String(error));
      finalError.name = "NonRetryableError";
      throw finalError;
    });
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
