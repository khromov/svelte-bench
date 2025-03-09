import type { LLMProvider } from "./index";
import { Anthropic } from "@anthropic-ai/sdk";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  name = "Anthropic";

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generate code from a prompt using Anthropic Claude
   * @param prompt The prompt to send to the LLM
   * @returns The generated code
   */
  async generateCode(prompt: string): Promise<string> {
    try {
      // Use model from environment variable or default to claude-3-sonnet-20240229
      const model = process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219";
      console.log(`🤖 Generating code with Anthropic using model: ${model}...`);

      const completion = await this.client.messages.create({
        model,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an expert Svelte developer. Generate only the Svelte component code requested. Return just the code with no explanation, comments, or markdown.\n\n${prompt}`,
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
   * Get the model identifier that was used for generation
   * @returns The model identifier string
   */
  getModelIdentifier(): string {
    return process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219";
  }
}
