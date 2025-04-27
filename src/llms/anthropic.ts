import { getSystemPrompt, getContextPrompt } from "../utils/prompt";
import type { LLMProvider } from "./index";
import { Anthropic } from "@anthropic-ai/sdk";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private modelId: string;
  name = "Anthropic";
  private readonly availableModels = [
    "claude-3-7-sonnet-20250219",
    // "claude-3-5-sonnet-20241022", // 3.5 v2
    // "claude-3-5-sonnet-20240620", // 3.5
    "claude-3-5-haiku-20241022",
    //  "claude-3-opus-20240229", <- no point testing old models
  ];

  constructor(modelId?: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    this.client = new Anthropic({ apiKey });
    this.modelId = modelId || this.availableModels[0];
  }

  /**
   * Generate code from a prompt using Anthropic Claude
   * @param prompt The prompt to send to the LLM
   * @returns The generated code
   */
  async generateCode(prompt: string): Promise<string> {
    try {
      console.log(
        `🤖 Generating code with Anthropic using model: ${this.modelId}...`
      );

      // Get system prompt from markdown file
      const systemPrompt = await getSystemPrompt();
      const contextPrompt = await getContextPrompt();

      const completion = await this.client.messages.create({
        model: this.modelId,
        max_tokens: 4000,
        system: systemPrompt + `--- # CONTEXT DOCUMENT\n\n You must read these CAREFULLY and adhere to these rules AT ALL TIMES. \n\n${contextPrompt}`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        // temperature: 0.7,
      });

      const generatedCode = completion.content[0]?.text || "";

      // Clean up any markdown code block indicators if present
      return generatedCode
        .replace(/\`\`\`svelte\s*/, "")
        .replace(/\`\`\`html\s*/, "")
        .replace(/\`\`\`\s*$/, "")
        .trim();
    } catch (error) {
      console.error("Error generating code with Anthropic:", error);
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
