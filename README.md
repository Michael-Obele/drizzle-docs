# drizzle-docs-mcp

[![latest release](https://img.shields.io/github/v/tag/Michael-Obele/drizzle-docs?sort=semver)](https://github.com/Michael-Obele/drizzle-docs/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-light.svg)](https://cursor.com/en-US/install-mcp?name=drizzle-docs-mcp&config=eyJjb21tYW5kIjoibnB4IC15IG1jcC1yZW1vdGUgaHR0cHM6Ly9kcml6emxlLm1hc3RyYS5jbG91ZC9hcGkvbWNwL2RyaXp6bGUtZG9jcy1tY3AvbWNwIn0%3D)

Mastra MCP server and tooling that provides real-time access to all Drizzle ORM documentation pages with fuzzy search, pre-caching, and flexible content retrieval.

## Production Deployments

Choose the base host that fits your workflow — both expose the same toolset, but their runtime characteristics differ:

| Host         | Base URL                     | Highlights                                                                                           |
| ------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Mastra Cloud | https://drizzle.mastra.cloud | **Primary choice** - Zero cold start, maximum responsiveness, and consistently reliable performance. |

- Append `/api/mcp/drizzle-docs-mcp/sse` for the SSE transport (best for editors that keep long-lived connections).
- Append `/api/mcp/drizzle-docs-mcp/mcp` for the HTTP transport (handy for CLIs and quick one-off calls).
- **Mastra Cloud is the recommended primary deployment** - it offers zero cold start and maximum responsiveness.

<details>
<summary>Endpoint reference & alternates</summary>

- **Mastra Cloud SSE**: https://drizzle.mastra.cloud/api/mcp/drizzle-docs-mcp/sse
- **Mastra Cloud HTTP**: https://drizzle.mastra.cloud/api/mcp/drizzle-docs-mcp/mcp

</details>

> [!NOTE]
> This project follows our [Code of Conduct](CODE_OF_CONDUCT.md) and welcomes contributions! See our [Contributing Guidelines](CONTRIBUTING.md) for details.

This repository contains a Mastra-based MCP server that provides real-time access to Drizzle ORM documentation using a hybrid of pre-caching and live fuzzy search. Use it in your AI-powered code editor to get instant access to the latest Drizzle ORM patterns directly from the official docs.

## Table of Contents

- [Production Deployments](#production-deployments)
- [Features](#-features)
- [Drizzle Ecosystem Integration](#drizzle-ecosystem-integration)
- [Observations & Minor UX Suggestions](#-observations--minor-ux-suggestions)
- [Editor Setup](#editor-setup)
- [CLI & Agent Configuration](#cli--agent-configuration)
- [Verification & Quick Tests](#verification--quick-tests)
- [Available Tools](#available-tools)
- [Example Usage](#example-usage)
- [Local Development](#local-development)
- [Developer Scripts](#developer-scripts)
- [MCP Architecture](#mcp-architecture)
- [Project Architecture](#project-architecture)
- [Contributing](#contributing)
- [License](#license)

## 🎉 Features

- ✅ Production deployment on Mastra Cloud
- ✅ **Three main MCP tools** for comprehensive Drizzle ORM support (see 'Available Tools')
- ✅ **Smart Fuzzy Search**: Powered by `fuse.js`, allowing for typos and partial matches.
- ✅ **Pre-caching**: Automatically fetches and indexes all 97 documentation pages at startup.
- ✅ **Flexible Content Retrieval**: Fetch full pages or specific sections in Markdown, JSON, or Plaintext.
- ✅ Support for all major AI code editors (Cursor, Windsurf, VS Code, Zed, Claude Code, Codex)
- ✅ HTTP and SSE transport protocols
- ✅ Real-time web scraping from `orm.drizzle.team`

## Drizzle Ecosystem Integration

Drizzle ORM is more than just an ORM; it's a "Headless TypeScript ORM with a Head." This MCP server provides access to the entire ecosystem:

- **Drizzle Kit**: CLI for migrations, introspection, and Studio.
- **Drizzle Relations (RQB)**: Best-in-class relational query builder.
- **Validation Libraries**: First-class support for `zod`, `valibot`, `typebox`, and `arktype`.
- **Serverless/Edge Ready**: Specific patterns for Turso, Neon, PlanetScale, and Cloudflare D1.

## 🔧 Observations & Suggestions

- The `search_docs` tool uses high-sensitivity fuzzy matching; if you get too many irrelevant results, try making your query more specific (e.g., "relational queries" instead of just "queries"). ✅
- Content is cached for performance, but the server will fetch fresh data if it detects significant upstream changes or if restarted. 💡
- The `fetch_page` tool allows for section-level extraction, which is highly recommended for keeping AI context windows clean.

## Editor Setup

**Mastra Cloud is the recommended primary deployment** for all editors. It offers zero cold start and maximum responsiveness. VS Code users can open the Command Palette (`Cmd/Ctrl+Shift+P`) and run `MCP: Add server` to paste the URL.

<details>
<summary>Cursor</summary>

1. Open Cursor Settings (`Cmd/Ctrl` + `,`).
2. Navigate to "MCP" / "Model Context Protocol".
3. **Mastra Cloud is recommended**. Append the SSE path as shown:

```json
{
  "drizzle-docs": {
    "type": "sse",
    "url": "https://drizzle.mastra.cloud/api/mcp/drizzle-docs-mcp/sse"
  }
}
```

</details>

<details>
<summary>Windsurf</summary>

1. Edit `~/.codeium/windsurf/mcp_config.json`.
2. Add the SSE transport as shown:

```json
{
  "mcpServers": {
    "drizzle-docs": {
      "url": "https://drizzle.mastra.cloud/api/mcp/drizzle-docs-mcp/sse",
      "transport": "sse"
    }
  }
}
```

</details>

<details>
<summary>VS Code</summary>

Run `MCP: Add Server` (Ctrl/Cmd+Shift+P) and paste the URL:

- SSE: `https://drizzle.mastra.cloud/api/mcp/drizzle-docs-mcp/sse`

</details>

## Available Tools

Once installed, your AI assistant will have access to these tools:

1. `list_topics` — Discover all 97 available Drizzle ORM documentation pages. Use this to understand the structure or find specific topic slugs.
2. `fetch_page` — Fetch and convert documentation pages to Markdown with optional filtering (slug, format, sections, maxLength).
3. `search_docs` — Search the documentation using intelligent fuzzy matching (query, limit).

## Example Usage

Ask your AI assistant:

- "Show me how to setup a Postgres schema in Drizzle"
- "List all Drizzle docs topics"
- "Search for relational query examples in Drizzle"
- "How do I handle migrations with Drizzle Kit?"
- "Compare Drizzle select vs relational query builders"

## Local Development

### Quick start

1. Install dependencies:

```bash
bun install
```

2. Start development server (Mastra Studio):

```bash
bun run dev
```

3. Build for production:

```bash
bun run build
```

## Developer Scripts

- `npm run dev` - Start Mastra Studio at localhost:4111.
- `npm run build` - Bundle the production-ready application.
- `npm run mcp` - Run the MCP server locally with TS support.
- `npm run check` - Verify TypeScript compilation.

## Project Architecture

- **Mastra Framework**: Orchestrates the MCP server and tools.
- **Smart Caching**: Pre-fetches docs on startup to ensure instant search results.
- **Turndown Service**: Convers HTML content into clean, AI-optimized Markdown.
- **Fuse.js**: Handles typo-tolerant search across slugs and titles.
- **Detailed Explanation**: See [`MCP_ARCHITECTURE.md`](MCP_ARCHITECTURE.md).

## License

This project is licensed under the [MIT License](LICENSE).

## Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before getting started.

## Contact

- **Issues & Support**: support@svelte-apps.me
- **Contributions**: contrib@svelte-apps.me
- **Maintainer**: Michael Amachree (michael@svelte-apps.me)
