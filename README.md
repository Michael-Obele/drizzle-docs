# Drizzle ORM Docs MCP

A Model Context Protocol (MCP) server that provides real-time access to Drizzle ORM documentation for AI models.

## Overview

This MCP server crawls the official Drizzle ORM documentation site (`orm.drizzle.team`) and provides tools for AI assistants to access up-to-date documentation, examples, and best practices.

## Features

- **Real-time Documentation Access**: Fetches the latest content from the official Drizzle docs
- **HTML to Markdown Conversion**: Converts rendered HTML to clean, readable Markdown
- **Content Caching**: Caches converted content for 1 hour to improve performance
- **Semantic Search**: Search across all cached documentation content
- **Topic Discovery**: Automatically discovers available documentation topics

## Tools

### `list_topics`

Browse the documentation hierarchy discovered from the Drizzle ORM docs site sidebar.

**Parameters**: None

**Returns**: List of available documentation topics with titles and URLs.

### `fetch_page`

Fetch the converted Markdown content of a specific documentation page.

**Parameters**:

- `slug` (string, required): The page slug (e.g., "sql-schema-declaration", "docs/overview")

**Returns**: Full Markdown content of the requested page.

### `search_docs`

Search for specific topics or error messages across cached documentation content.

**Parameters**:

- `query` (string, required): Search query (e.g., "relational queries", "schema declaration")
- `limit` (number, optional): Maximum number of results to return (default: 10)

**Returns**: Search results with excerpts, scores, and page references.

## Installation

```bash
npm install
```

## Usage

### As an MCP Server

Run the server using:

```bash
npm run mcp
```

Or directly:

```bash
node index.ts
```

### Integration with AI Clients

This MCP server can be integrated with any MCP-compatible client such as:

- Claude Desktop
- Cursor
- VS Code with MCP extensions
- Other MCP-compatible AI assistants

Example configuration for Claude Desktop:

```json
{
  "mcpServers": {
    "drizzle-docs": {
      "command": "node",
      "args": ["/path/to/drizzle-docs/index.ts"]
    }
  }
}
```

## Development

### Building

```bash
npm run build
```

### Testing

The server includes comprehensive error handling and will provide meaningful error messages for failed requests.

## Architecture

- **Web Crawling**: Uses `cheerio` and `fetch` to discover and download documentation pages
- **Content Processing**: Converts HTML to Markdown using `turndown`
- **Caching**: In-memory caching with 1-hour TTL
- **MCP Protocol**: Implements the Model Context Protocol over stdio transport

## Dependencies

- `@modelcontextprotocol/sdk`: Official MCP SDK
- `cheerio`: HTML parsing and manipulation
- `turndown`: HTML to Markdown conversion
- `zod`: Schema validation

## License

MIT

Welcome to your new [Mastra](https://mastra.ai/) project! We're excited to see what you'll build.

## Getting Started

Start the development server:

```shell
bun run dev
```

Open [http://localhost:4111](http://localhost:4111) in your browser to access [Mastra Studio](https://mastra.ai/docs/getting-started/studio). It provides an interactive UI for building and testing your agents, along with a REST API that exposes your Mastra application as a local service. This lets you start building without worrying about integration right away.

You can start editing files inside the `src/mastra` directory. The development server will automatically reload whenever you make changes.

## Learn more

To learn more about Mastra, visit our [documentation](https://mastra.ai/docs/). Your bootstrapped project includes example code for [agents](https://mastra.ai/docs/agents/overview), [tools](https://mastra.ai/docs/agents/using-tools), [workflows](https://mastra.ai/docs/workflows/overview), [scorers](https://mastra.ai/docs/evals/overview), and [observability](https://mastra.ai/docs/observability/overview).

If you're new to AI agents, check out our [course](https://mastra.ai/course) and [YouTube videos](https://youtube.com/@mastra-ai). You can also join our [Discord](https://discord.gg/BTYqqHKUrf) community to get help and share your projects.

## Deploy on Mastra Cloud

[Mastra Cloud](https://cloud.mastra.ai/) gives you a serverless agent environment with atomic deployments. Access your agents from anywhere and monitor performance. Make sure they don't go off the rails with evals and tracing.

Check out the [deployment guide](https://mastra.ai/docs/deployment/overview) for more details.
