import { Agent } from "undici";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";
import { Ollama, type ChatRequest } from "ollama";

// https://github.com/ollama/ollama-js/issues/103
const noTimeoutFetch = (input: string | URL | globalThis.Request, init?: RequestInit) => {
  const someInit = init || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fetch(input, {
    ...someInit,
    dispatcher: new Agent({ headersTimeout: 2700000 }),
  } as any);
};

export class LEGACY_OllamaProvider implements LLMProvider {
  private client: Ollama;
  private modelId: string;
  name = "Ollama";
  private readonly availableModels = ["hf.co/bartowski/open-thoughts_OpenThinker3-7B-GGUF:Q8_0"];

  constructor(modelId?: string) {
    // Get Ollama host from environment variable or use default
    const host = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

    this.client = new Ollama({ host, fetch: noTimeoutFetch });
    this.modelId = modelId || this.availableModels[0];
  }

  /**
   * Generate code from a prompt using Ollama
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature parameter for controlling randomness (default: 0.7)
   * @param contextContent Optional context content to include in prompts
   * @returns The generated code
   */
  async generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string> {
    try {
      console.log(`🤖 Generating code with Ollama using model: ${this.modelId} (temp: ${temperature ?? "default"})...`);

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

      const requestOptions: ChatRequest & { stream: false } = {
        model: this.modelId,
        messages: messages,
        stream: false,
      };

      // Add temperature if it's defined
      if (temperature !== undefined) {
        requestOptions.options = {
          temperature: temperature,
        };
      }

      const response = (await this.client.chat(requestOptions)) as any;

      return response.message?.content || "";
    } catch (error) {
      console.error("Error generating code with Ollama:", error);
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`);
    }
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
