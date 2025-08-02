import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../utils/prompt";
import type { LLMProvider } from "./index";
// @ts-ignore
import { ZAI } from "../../../node_modules/zai-sdk/src/client";

export class ZAIProvider implements LLMProvider {
  private client: ZAI;
  private modelId: string;
  name = "Z.AI";
  private readonly availableModels = [
    "glm-4",
  ];

  constructor(modelId?: string) {
    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) {
      throw new Error("ZAI_API_KEY environment variable is required");
    }
    this.client = new ZAI({ apiKey });
    this.modelId = modelId || this.availableModels[0];
  }

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

      const messages = [
        {
          role: "user",
          content: contextContent
            ? `${systemPrompt}\n\n${contextContent}\n\n${prompt}`
            : `${systemPrompt}\n\n${prompt}`,
        },
      ];

      const requestOptions: any = {
        model: this.modelId,
        messages: messages,
      };

      if (temperature !== undefined) {
        requestOptions.temperature = temperature;
      }

      const completion = await this.client.chat.create(requestOptions);

      return completion.choices[0]?.message.content || "";
    } catch (error) {
      console.error("Error generating code with Z.AI:", error);
      throw new Error(
        `Failed to generate code: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  getModels(): string[] {
    return [...this.availableModels];
  }

  getModelIdentifier(): string {
    return this.modelId;
  }
}
