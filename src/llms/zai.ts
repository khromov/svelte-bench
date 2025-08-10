import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../utils/prompt";
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
  async generateCode(
    prompt: string,
    temperature?: number,
    contextContent?: string,
  ): Promise<string> {
    console.log(
      `🤖 Generating code with Z.ai using model: ${this.modelId} (temp: ${temperature ?? "default"})...`,
    );

    const systemPrompt = contextContent
      ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT
      : DEFAULT_SYSTEM_PROMPT;

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
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 2 * 60 * 1000); // 2 minutes

        try {
          const response = await fetch(
            "https://open.bigmodel.cn/api/paas/v4/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
              },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            },
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            // Check for rate limiting or temporary errors
            if (response.status === 429 || response.status >= 500) {
              throw new Error(
                `Z.ai API temporary error: ${response.status} ${response.statusText}`,
              );
            }
            // Non-retryable error
            throw new Error(
              `Z.ai API request failed: ${response.status} ${response.statusText}`,
            );
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          
          if (!content) {
            throw new Error("Z.ai returned empty response");
          }
          
          return content;
        } catch (error) {
          clearTimeout(timeoutId);
          
          // Check if it's an abort error (timeout)
          if (error instanceof Error && error.name === 'AbortError') {
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
          console.warn(
            `⚠️  Z.ai retry attempt ${attempt}/10 for model ${this.modelId} after error: ${error.message}`,
          );
          
          // On final retry attempt, provide helpful message before failing
          if (attempt === 10) {
            console.error(`\n❌ Z.ai model ${this.modelId} failed after 10 retry attempts.`);
            console.error(`📝 The benchmark will resume from where it left off when you restart.`);
            console.error(`⏳ This appears to be a rate limit issue. Please wait before retrying.`);
            console.error(`💾 Progress has been saved to the checkpoint file.\n`);
          }
        },
      },
    ).catch((error) => {
      // If all retries failed, exit the process with error
      console.error(`\n🛑 Stopping benchmark due to persistent Z.ai API failures.`);
      console.error(`ℹ️  To resume, run the same command again. The benchmark will continue from the last checkpoint.`);
      process.exit(1);
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
