import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  HTTPClientTransport,
} from "@modelcontextprotocol/sdk/client/index.js";
import type { Tool } from "ai";

/**
 * Svelte MCP Client
 * Connects to the Svelte MCP server via HTTP transport
 * to provide Svelte-specific tools for code generation
 */

let mcpClient: Client | null = null;
let mcpTools: Tool[] | null = null;

/**
 * Initialize MCP client connection to Svelte server
 * Uses HTTP transport to connect to the remote MCP server
 * @returns Client instance
 */
async function initializeMCPClient(): Promise<Client> {
  if (mcpClient) {
    return mcpClient;
  }

  try {
    console.log("🔌 Connecting to Svelte MCP server via HTTP...");

    // Create HTTP transport for remote MCP server
    // The Svelte MCP server is hosted at https://mcp.svelte.dev/mcp
    const transport = new HTTPClientTransport({
      url: new URL("https://mcp.svelte.dev/mcp"),
    });

    // Create MCP client
    mcpClient = new Client({
      name: "svelte-bench",
      version: "1.0.0",
    });

    // Connect to the MCP server
    await mcpClient.connect(transport);

    console.log("✓ Connected to Svelte MCP server");

    return mcpClient;
  } catch (error) {
    console.error("❌ Failed to connect to Svelte MCP server:", error);
    throw new Error(
      `Failed to initialize MCP client: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
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

    // Convert MCP tools to AI SDK tool format
    // The MCP tools method on the client acts as an adapter
    const toolsAdapter = (client as any).tools() as Tool[] | undefined;

    mcpTools = toolsAdapter || [];

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
 * @param toolName Name of the tool to call
 * @param toolInput Input parameters for the tool
 * @returns Tool execution result
 */
export async function processMCPToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  try {
    if (!mcpClient) {
      throw new Error("MCP client not initialized");
    }

    // Execute tool via MCP server
    const result = await mcpClient.request(
      {
        method: "tools/call",
        params: {
          name: toolName,
          arguments: toolInput,
        },
      }
    ) as any;

    // Extract text content from MCP response
    const textContent = (result.content as Array<{ type: string; text: string }>)
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    return textContent;
  } catch (error) {
    console.error(`❌ Error calling MCP tool "${toolName}":`, error);
    throw new Error(
      `MCP tool execution failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Close MCP client connection
 */
export async function closeMCPClient(): Promise<void> {
  if (mcpClient) {
    try {
      // Close transport connection
      mcpClient.close?.();
      mcpClient = null;
      mcpTools = null;
      console.log("✓ Closed Svelte MCP server connection");
    } catch (error) {
      console.error("⚠️  Error closing MCP client:", error);
    }
  }
}
