import type { LLMProvider } from "./index";
import OpenAI from "openai";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  name = "OpenAI";

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generate code from a prompt using OpenAI
   * @param prompt The prompt to send to the LLM
   * @returns The generated code
   */
  async generateCode(prompt: string): Promise<string> {
    try {
      // Use model from environment variable or default to gpt-4o
      const model = process.env.OPENAI_MODEL || "gpt-4o";
      console.log(`🤖 Generating code with OpenAI using model: ${model}...`);

      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert Svelte developer. Generate only the Svelte component code requested. Return just the code with no explanation, comments, or markdown.",
          },
          { role: "user", content: prompt },
        ],
        // temperature: 0.7,
      });

      const generatedCode = completion.choices[0]?.message.content || "";

      // Clean up any markdown code block indicators if present
      return generatedCode
        .replace(/```svelte\s*/, "")
        .replace(/```html\s*/, "")
        .replace(/```\s*$/, "")
        .trim();
    } catch (error) {
      console.error("Error generating code with OpenAI:", error);
      throw new Error(
        `Failed to generate code: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
