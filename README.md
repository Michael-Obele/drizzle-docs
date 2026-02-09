# 🌧️ Drizzle ORM Docs MCP (Mastra)

A production-grade Model Context Protocol (MCP) server that provides comprehensive access to all 97 Drizzle ORM documentation pages with fuzzy search, pre-caching, and flexible content retrieval.

Built with [Mastra](https://mastra.ai/), this server provides real-time access to the official Drizzle ORM documentation (`orm.drizzle.team`) for AI models.

## 🚀 Live Endpoints

The Drizzle Docs MCP server is live on Mastra Cloud:

| Transport | Description                                        | Endpoint                                                                      |
| --------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| **HTTP**  | Stateless HTTP transport with streamable responses | `https://drizzle.mastra.cloud/api/mcp/drizzle-docs-mcp/mcp`                   |
| **SSE**   | Real-time communication via Server-Sent Events     | `https://drizzle.mastra.cloud/api/mcp/drizzle-docs-mcp/sse`                   |
| **CLI**   | Local command-line access via npx                  | `npx -y mcp-remote https://drizzle.mastra.cloud/api/mcp/drizzle-docs-mcp/sse` |

## 📦 Features

- **🔍 Smart Fuzzy Search**: Powered by `fuse.js`, allowing for typos and partial matches.
- **⚡ Pre-caching**: Automatically fetches and indexes all 97 documentation pages at startup.
- **📝 Flexible Content Retrieval**: Fetch full pages or specific sections in Markdown, JSON, or Plaintext.
- **🛠️ MCP Native**: Includes full MCP annotations for tool discovery and client-side optimization.
- **🔗 Real-time Updates**: Fetches the latest content from the official source.

## 🛠️ Tools

### `list_topics`

Discover all 97 available Drizzle ORM documentation pages. Use this to understand the structure or find specific topic slugs.

- **Parameters**: None
- **Use Case**: Initial discovery and hierarchy browsing.

### `fetch_page`

Fetch and convert documentation pages to Markdown with optional filtering.

- **Required Parameters**:
  - `slug` (string): The page slug (e.g., `"docs/select"`, `"docs/insert"`).
- **Optional Parameters**:
  - `format` (enum): `markdown` (default), `json`, or `plaintext`.
  - `sections` (array): Extract only specific sections by header name (e.g., `["Examples", "Basic Usage"]`).
  - `maxLength` (number): Truncate response to specified character length.

### `search_docs`

Search the documentation using intelligent fuzzy matching.

- **Required Parameters**:
  - `query` (string): Search query (e.g., `"relational queries"`, `"migrations"`).
- **Optional Parameters**:
  - `limit` (number): Maximum number of results to return (default: 10, max: 50).

## 🔌 Integration

### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "drizzle-docs": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://drizzle.mastra.cloud/api/mcp/drizzle-docs-mcp/sse"
      ]
    }
  }
}
```

## 🏗️ Development

### Local Setup

```bash
# Install dependencies
bun install

# Start development server (Mastra Studio)
bun run dev

# Build for production
bun run build

# Run local MCP server
npm run mcp
```

### Commands

| Script  | Description                                |
| ------- | ------------------------------------------ |
| `dev`   | Start Mastra Studio at localhost:4111      |
| `build` | Bundle the production-ready application    |
| `mcp`   | Run the MCP server locally with TS support |
| `check` | Verify TypeScript compilation              |

## 🌐 Deploy on Mastra Cloud

This server is optimized for [Mastra Cloud](https://cloud.mastra.ai/), providing serverless agent environments with atomic deployments and built-in observability.

## 📄 License

MIT © Michael Amachree (Michael-Obele)
