import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function inspectMCPTools() {
  try {
    console.log('🔍 Inspecting MCP tools...');
    
    // Create MCP client directly to get raw tool info
    const transport = new StreamableHTTPClientTransport(
      new URL("https://mcp.svelte.dev/mcp"),
      {
        sessionId: `svelte-bench-${Date.now()}`,
      }
    );

    const client = await createMCPClient({
      transport,
    });

    console.log("✓ Connected to Svelte MCP server");
    
    // Get tools from MCP client
    const tools = await client.tools();
    const toolEntries = Object.entries(tools);
    
    console.log(`Found ${toolEntries.length} tools:`);
    toolEntries.forEach(([name, tool], index) => {
      console.log(`\nTool ${index + 1}:`);
      console.log(`  Name: "${name}"`);
      console.log(`  Description: ${tool.description || 'No description'}`);
      console.log(`  Input Schema: ${JSON.stringify(tool.inputSchema, null, 2)}`);
    });
    
    // Check for naming issues
    console.log('\n🚨 Naming analysis:');
    toolEntries.forEach(([name, tool]) => {
      const issues = [];
      
      // Check Google's naming requirements
      if (!/^[a-zA-Z_]/.test(name)) {
        issues.push('Does not start with letter or underscore');
      }
      
      if (!/^[a-zA-Z0-9_.:-]+$/.test(name)) {
        issues.push('Contains invalid characters');
      }
      
      if (name.length > 64) {
        issues.push('Exceeds 64 character limit');
      }
      
      if (issues.length > 0) {
        console.log(`\n❌ Tool "${name}" has issues:`);
        issues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log(`✅ Tool "${name}" is valid for Google`);
      }
    });
    
    await client.close();
    console.log("✓ Closed Svelte MCP server connection");
  } catch (error) {
    console.error('Error:', error);
  }
}

inspectMCPTools();