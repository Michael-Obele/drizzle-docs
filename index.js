#!/usr/bin/env node
import { drizzleDocsMcpServer } from './src/mastra/mcp/drizzle-docs-mcp.js';
// Start the MCP server
drizzleDocsMcpServer.startStdio().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
