import { Agent, fetch as undiciFetch } from "undici";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../utils/prompt";
import type { LLMProvider } from "./index";
import { Ollama, type ChatRequest } from "ollama";
import { log } from "../utils/tui-events";

// Hard cap for a single Ollama request (including reading the response body)
const OLLAMA_TIMEOUT_MS = 4 * 60 * 60 * 1000;

// Raise undici's default 5 minute timeouts, since non-streaming responses only
// arrive once generation finishes: https://github.com/ollama/ollama-js/issues/103
const dispatcher = new Agent({
  headersTimeout: OLLAMA_TIMEOUT_MS,
  bodyTimeout: OLLAMA_TIMEOUT_MS,
});

const timeoutFetch = (
  input: string | URL | globalThis.Request,
  init?: RequestInit
) => {
  const someInit = init || {};
  const timeoutSignal = AbortSignal.timeout(OLLAMA_TIMEOUT_MS);
  // Must be undici's own fetch: Node's built-in fetch bundles a different undici
  // version and rejects this Agent with "invalid onRequestStart method"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return undiciFetch(input as any, {
    ...someInit,
    signal: someInit.signal
      ? AbortSignal.any([someInit.signal, timeoutSignal])
      : timeoutSignal,
    dispatcher,
  } as any);
};

/**
 * Resolve the Ollama host from the environment, falling back to the local default
 */
export function getOllamaHost(): string {
  return process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
}

/**
 * Create an Ollama client with the long request timeouts the benchmark needs
 */
export function createOllamaClient(host: string = getOllamaHost()): Ollama {
  // The wrapper only implements the call signature, not fetch's static helpers,
  // and returns undici's Response rather than the global one
  return new Ollama({ host, fetch: timeoutFetch as unknown as typeof fetch });
}

export class OllamaProvider implements LLMProvider {
  private client: Ollama;
  private modelId: string;
  name = "Ollama";
  private readonly availableModels = [
    "hf.co/bartowski/open-thoughts_OpenThinker3-7B-GGUF:Q8_0",
  ];

  constructor(modelId?: string) {
    this.client = createOllamaClient();
    this.modelId = modelId || this.availableModels[0];
  }

  /**
   * Generate code from a prompt using Ollama
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature parameter for controlling randomness (default: 0.7)
   * @param contextContent Optional context content to include in prompts
   * @returns The generated code
   */
  async generateCode(
    prompt: string,
    temperature?: number,
    contextContent?: string
  ): Promise<string> {
    try {
      log(
        `🤖 Generating code with Ollama using model: ${this.modelId} (temp: ${
          temperature ?? "default"
        })...`
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
      if (error instanceof Error && error.name === "TimeoutError") {
        const message = `Ollama request timed out after ${OLLAMA_TIMEOUT_MS / 3600000} hours`;
        console.error(`⏱️ ${message} (model: ${this.modelId})`);
        throw new Error(message);
      }

      console.error("Error generating code with Ollama:", error);
      throw new Error(
        `Failed to generate code: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
