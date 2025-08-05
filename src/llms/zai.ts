import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../utils/prompt";
import type { LLMProvider } from "./index";

export class ZAIProvider implements LLMProvider {
  private apiKey: string;
  private modelId: string;
  name = "zai";
  private readonly availableModels = [
    "glm-4.5",
    "glm-4.5-air", 
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
   * Generate code from a prompt using Z.AI
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
      console.log(
        `🤖 Generating code with Z.AI using model: ${this.modelId} (temp: ${temperature ?? 'default'})...`
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

      const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Z.AI API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.choices?.[0]?.message?.content || "";
    } catch (error) {
      console.error("Error generating code with Z.AI:", error);
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
