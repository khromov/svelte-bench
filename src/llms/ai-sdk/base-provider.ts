import { generateText, type ModelMessage } from "ai";
import type { LLMProvider } from "../index";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT,
} from "../../utils/prompt";
import {
  validateModel,
  formatValidationResult,
  type ValidationResult,
} from "./model-validator";
import { getRegistry } from "./unified-registry";

/**
 * Unified AI SDK Provider Wrapper
 * Uses the unified provider registry to access all providers via provider:model format
 */
export class AISDKProviderWrapper implements LLMProvider {
  name: string;
  private fullModelId: string; // Format: "provider:model"
  private providerName: string;
  private modelId: string;

  /**
   * Create provider wrapper
   * @param providerName Provider name (e.g., 'openai')
   * @param modelId Model identifier (e.g., 'gpt-4o')
   */
  constructor(providerName: string, modelId: string) {
    this.providerName = providerName;
    this.name = providerName;
    this.modelId = modelId;
    this.fullModelId = `${providerName}:${modelId}`;
  }

  /**
   * Generate code from a prompt using AI SDK unified registry
   * @param prompt The prompt to send to the LLM
   * @param temperature Optional temperature parameter for controlling randomness (default: 0.7)
   * @param contextContent Optional context content to include in prompts
   * @param enableMCP Optional flag to enable MCP tools from Svelte server
   * @returns The generated code
   */
  async generateCode(
    prompt: string,
    temperature?: number,
    contextContent?: string,
    enableMCP?: boolean
  ): Promise<string> {
    try {
      console.log(
        `🤖 Generating code with ${this.providerName} using model: ${
          this.modelId
        } (temp: ${temperature ?? "default"})...`
      );

      const systemPrompt = contextContent
        ? DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT
        : DEFAULT_SYSTEM_PROMPT;

      // Build messages array
      const messages: ModelMessage[] = [
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

      // Get model from unified registry (lazy-loaded on first use)
      const registry = await getRegistry();
      const model = (registry as any).languageModel(this.fullModelId);

      // Build request options
      const requestOptions: Parameters<typeof generateText>[0] = {
        model,
        messages,
      };

      // Only add temperature if it's defined
      if (temperature !== undefined) {
        requestOptions.temperature = temperature;
      }

      // Add MCP tools if enabled, but not for benchmark generation
      // MCP tools interfere with benchmark code generation as LLM prefers tools over direct generation
      if (enableMCP && false) {
        // Disabled for benchmark generation
        try {
          const { getMCPTools } = await import("../mcp/svelte-mcp-client");
          const mcpTools = await getMCPTools();
          if (mcpTools && mcpTools.length > 0) {
            // Debug: Log tool details for Google compatibility check
            console.log(`🔍 Debugging MCP tools for ${this.providerName}:`);
            mcpTools.forEach((tool: any, index: number) => {
              const toolName = tool.name || `tool_${index}`;
              console.log(`  Tool ${index + 1}: "${toolName}"`);
              if (this.providerName === "google") {
                // Check Google's naming requirements
                const issues = [];
                if (!/^[a-zA-Z_]/.test(toolName)) {
                  issues.push("Does not start with letter or underscore");
                }
                if (!/^[a-zA-Z0-9_.:-]+$/.test(toolName)) {
                  issues.push("Contains invalid characters");
                }
                if (toolName.length > 64) {
                  issues.push("Exceeds 64 character limit");
                }
                if (issues.length > 0) {
                  console.log(
                    `    ❌ Google naming issues: ${issues.join(", ")}`
                  );
                } else {
                  console.log(`    ✅ Valid for Google`);
                }
              }
            });

            // Convert tools array to ToolSet object format
            const toolSet = mcpTools.reduce((acc: Record<string, any>, tool: any) => {
              const toolName = tool.name || `tool_${Object.keys(acc).length}`;
              acc[toolName] = tool;
              return acc;
            }, {});
            requestOptions.tools = toolSet;
            console.log(`✓ Added ${mcpTools.length} MCP tools to request`);
          }
        } catch (mcpError) {
          console.warn("⚠️  Failed to load MCP tools:", mcpError);
          // Continue without MCP tools if loading fails
        }
      }

      // Generate text using AI SDK
      const result = await generateText(requestOptions);

      return result.text;
    } catch (error) {
      console.error(`Error generating code with ${this.providerName}:`, error);
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
    // Return empty array since models are now dynamically validated
    return [];
  }

  /**
   * Get the model identifier that was used for generation
   * @returns The model identifier string
   */
  getModelIdentifier(): string {
    return this.modelId;
  }

  /**
   * Validate this model's capabilities
   * @returns Validation result
   */
  async validate(): Promise<ValidationResult> {
    const validation = validateModel(this.modelId);

    // Log validation result
    const formatted = formatValidationResult(this.modelId, validation);
    if (!validation.isValid) {
      console.error(formatted);
      validation.errors.forEach((err) => console.error(`  ${err}`));
    } else if (validation.warnings.length > 0) {
      console.warn(formatted);
      validation.warnings.forEach((warn) => console.warn(`  ${warn}`));
    } else {
      console.log(formatted);
    }

    return validation;
  }
}
