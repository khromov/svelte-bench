import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "ai";

/**
 * Svelte MCP Client
 * Connects to the Svelte MCP server via HTTP transport
 * to provide Svelte-specific tools for code generation
 */

let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
let mcpTools: Tool[] | null = null;

/**
 * Initialize MCP client connection to Svelte server
 * Uses HTTP transport to connect to the remote MCP server
 * @returns Client instance
 */
async function initializeMCPClient() {
  if (mcpClient) {
    return mcpClient;
  }

  try {
    console.log("🔌 Connecting to Svelte MCP server via HTTP...");

    // Create HTTP transport for remote MCP server
    // The Svelte MCP server is hosted at https://mcp.svelte.dev/mcp
    const transport = new StreamableHTTPClientTransport(new URL("https://mcp.svelte.dev/mcp"), {
      sessionId: `svelte-bench-${Date.now()}`,
    });

    // Create MCP client using AI SDK
    mcpClient = await createMCPClient({
      transport,
    });

    console.log("✓ Connected to Svelte MCP server");

    return mcpClient;
  } catch (error) {
    console.error("❌ Failed to connect to Svelte MCP server:", error);
    throw new Error(`Failed to initialize MCP client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get available MCP tools from Svelte server
 * @returns Array of AI SDK Tool objects
 */
export async function getMCPTools(): Promise<Tool[]> {
  if (mcpTools) {
    return mcpTools;
  }

  try {
    const client = await initializeMCPClient();

    // Get tools from MCP client using AI SDK adapter
    const tools = await client.tools();

    // Extract tools while preserving their names
    mcpTools = Object.entries(tools).map(([name, tool]) => {
      const toolObj = tool as any; // Type assertion for tool access
      return {
        ...tool,
        name: toolObj.name || name, // Ensure the tool has the correct name
      };
    });

    console.log(`✓ Loaded ${mcpTools.length} tools from Svelte MCP server`);

    return mcpTools;
  } catch (error) {
    console.error("❌ Failed to get MCP tools:", error);
    // Return empty array instead of throwing to prevent blocking
    return [];
  }
}

/**
 * Process MCP tool calls from LLM responses
 * Note: With AI SDK MCP integration, tool calls are handled automatically
 * This function is kept for compatibility but may not be needed
 * @param toolName Name of the tool to call
 * @param toolInput Input parameters for the tool
 * @returns Tool execution result
 */
export async function processMCPToolCall(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
  try {
    if (!mcpClient) {
      throw new Error("MCP client not initialized");
    }

    // With AI SDK MCP integration, tool calls are handled automatically
    // This is a fallback for manual tool execution
    const tools = await mcpClient.tools();
    const toolEntries = Object.entries(tools);
    const tool = toolEntries.find(([name, tool]) => name === toolName);

    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    // For AI SDK MCP tools, execution is handled differently
    // Return a placeholder message since tool execution is automatic
    return `Tool "${toolName}" execution handled by AI SDK MCP integration`;
  } catch (error) {
    console.error(`❌ Error calling MCP tool "${toolName}":`, error);
    throw new Error(`MCP tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Close MCP client connection
 */
export async function closeMCPClient(): Promise<void> {
  if (mcpClient) {
    try {
      // Close MCP client connection
      await mcpClient.close();
      mcpClient = null;
      mcpTools = null;
      console.log("✓ Closed Svelte MCP server connection");
    } catch (error) {
      console.error("⚠️  Error closing MCP client:", error);
    }
  }
}
