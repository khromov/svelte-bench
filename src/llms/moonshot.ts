import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";
import { withRetry } from "../utils/retry-wrapper";

interface MoonshotMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MoonshotRequest {
  model: string;
  messages: MoonshotMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface MoonshotChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface MoonshotResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: MoonshotChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LEGACY_MoonshotProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private modelId: string;
  name = "Moonshot";

  constructor(modelId?: string) {
    const apiKey = process.env.MOONSHOT_API_KEY;
    if (!apiKey) {
      throw new Error("MOONSHOT_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
    this.baseUrl = "https://api.moonshot.ai/v1";
    // Default to moonshot-v1-8k if no model specified
    this.modelId = modelId || "moonshot-v1-8k";
  }

  /**
   * Generate code from a prompt using Moonshot AI
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature parameter for controlling randomness (default: 0.7)
   * @param contextContent Optional context content to include in prompts
   * @returns The generated code
   */
  async generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string> {
    // Ensure temperature is within valid range [0, 1]
    const validTemperature = temperature !== undefined ? Math.max(0, Math.min(1, temperature)) : 0.7;

    console.log(`🤖 Generating code with Moonshot using model: ${this.modelId} (temp: ${validTemperature})...`);

    const systemPrompt = contextContent ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT : DEFAULT_SYSTEM_PROMPT;

    const messages: MoonshotMessage[] = [
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

    const requestBody: MoonshotRequest = {
      model: this.modelId,
      messages,
      temperature: validTemperature,
      max_tokens: 4000,
      stream: false,
    };

    // Wrap the API call in retry logic with custom settings for Moonshot
    return await withRetry(
      async () => {
        // Create AbortController for timeout (2 minutes for Moonshot models)
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => {
            controller.abort();
          },
          2 * 60 * 1000,
        ); // 2 minutes

        try {
          const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();

            // Check for rate limiting or temporary errors
            if (response.status === 429 || response.status >= 500) {
              throw new Error(`Moonshot API temporary error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            // Non-retryable error
            throw new Error(`Moonshot API request failed: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data: MoonshotResponse = await response.json();

          if (!data.choices || data.choices.length === 0) {
            throw new Error("Moonshot returned empty response");
          }

          return data.choices[0].message.content;
        } catch (error) {
          clearTimeout(timeoutId);

          // Check if it's an abort error (timeout)
          if (error instanceof Error && error.name === "AbortError") {
            console.error(`Moonshot request timed out after 2 minutes for model: ${this.modelId}`);
            throw new Error(`Request timed out after 2 minutes: ${this.modelId}`);
          }

          throw error;
        }
      },
      {
        maxAttempts: 10,
        initialDelayMs: 2000, // Start with 2 seconds for Moonshot
        maxDelayMs: 60000, // Max 1 minute between retries
        backoffFactor: 2,
        onRetry: (error, attempt) => {
          console.warn(
            `⚠️  Moonshot retry attempt ${attempt}/10 for model ${this.modelId} after error: ${error.message}`,
          );

          // On final retry attempt, provide helpful message before failing
          if (attempt === 10) {
            console.error(`\n❌ Moonshot model ${this.modelId} failed after 10 retry attempts.`);
            console.error(`📝 The benchmark will resume from where it left off when you restart.`);
            console.error(`⏳ This appears to be a rate limit issue. Please wait before retrying.`);
            console.error(`💾 Progress has been saved to the checkpoint file.\n`);
          }
        },
      },
    ).catch((error) => {
      // If all retries failed, exit the process with error
      console.error(`\n🛑 Stopping benchmark due to persistent Moonshot API failures.`);
      console.error(`ℹ️  To resume, run the same command again. The benchmark will continue from the last checkpoint.`);
      process.exit(1);
    });
  }

  /**
   * Get all available models for this provider
   * @returns Array of model identifiers
   */
  getModels(): string[] {
    return ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"];
  }

  /**
   * Get the model identifier that was used for generation
   * @returns The model identifier string
   */
  getModelIdentifier(): string {
    return this.modelId;
  }
}
