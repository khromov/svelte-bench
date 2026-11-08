import { recordApiResponse } from "../utils/api-cost";
import type { SDKAgent } from "@cursor/sdk";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import type { LLMProvider } from "./index";
import { Agent } from "@cursor/sdk";
import fs from "fs/promises";
import os from "os";
import path from "path";

const OUTPUT_FILENAME = "Component.svelte";

export class CursorProvider implements LLMProvider {
  private modelId: string;
  name = "Cursor";

  constructor(modelId?: string) {
    if (!process.env.CURSOR_API_KEY) {
      throw new Error("CURSOR_API_KEY environment variable is required");
    }

    // Default to the Composer model if no model specified
    this.modelId = modelId || "composer-1";
  }

  /**
   * Generate code from a prompt using the Cursor agent SDK
   *
   * Cursor doesn't expose a raw completion endpoint - Composer is only
   * reachable through the agentic SDK. We run the agent in a scratch
   * directory, ask it to write the component to a fixed filename, then
   * read that file back off disk as the "generated code" string.
   */
  async generateCode(prompt: string, temperature?: number, contextContent?: string): Promise<string> {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "svelte-bench-cursor-"));

    let agent: SDKAgent | undefined;
    try {
      console.log(`🤖 Generating code with Cursor using model: ${this.modelId}...`);

      const systemPrompt = contextContent ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT : DEFAULT_SYSTEM_PROMPT;

      const fullPrompt = [
        systemPrompt,
        contextContent ? `\n\nDocumentation context:\n${contextContent}` : "",
        `\n\n${prompt}`,
        `\n\nWrite the component to a file named "${OUTPUT_FILENAME}" in the current working directory. Do not create any other files.`,
      ].join("");

      agent = await Agent.create({
        // The SDK does not implicitly read CURSOR_API_KEY. Passing it here is
        // required to authenticate the local agent run with the configured
        // Cursor user API key.
        apiKey: process.env.CURSOR_API_KEY,
        model: { id: this.modelId },
        local: {
          cwd,
          sandboxOptions: { enabled: false },
        },
      });

      const run = await agent.send(fullPrompt);
      const result = await run.wait();
      // One fresh agent per benchmark sample, so its totals contain no other samples.
      let billed;
      try {
        billed = await agent.getUsage();
      } catch {
        console.warn("Cursor billed usage is unavailable; retaining the run's token usage");
      }
      recordApiResponse(this.name, this.modelId, {
        id: result.id,
        usage: billed?.usage ?? result.usage,
        cost: billed?.cost,
      });

      if (result.status === "error") {
        throw new Error(`Cursor agent run failed: ${result.error?.message ?? "unknown error"}`);
      }

      const componentPath = path.join(cwd, OUTPUT_FILENAME);
      const code = await fs.readFile(componentPath, "utf-8");
      return code;
    } catch (error) {
      console.error("Error generating code with Cursor:", error);
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      agent?.close();
      await fs.rm(cwd, { recursive: true, force: true });
    }
  }

  /**
   * Get all available models for this provider
   * @returns Array of model identifiers
   */
  getModels(): string[] {
    return [];
  }

  /**
   * Get the model identifier that was used for generation
   * @returns The model identifier string
   */
  getModelIdentifier(): string {
    return this.modelId;
  }
}
