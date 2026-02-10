# MCP Architecture: drizzle-docs-mcp

This document outlines the technical architecture of the Drizzle ORM Docs MCP server, built with the [Mastra](https://mastra.ai/) framework.

## Overview

The `drizzle-docs-mcp` is a Model Context Protocol (MCP) server that provides AI assistants with real-time, searchable access to the official Drizzle ORM documentation. It uses a hybrid approach of pre-caching and live scraping to ensure high performance and data freshness.

## Core Components

### 1. Mastra Framework

Mastra serves as the orchestration layer, managing:

- **Agents**: Specialized AI entities (like the weather agent in the template, though the focus is on the MCP tools).
- **Workflows**: Multi-step processes for complex tasks.
- **MCP Server**: The interface that exposes tools to external clients (Cursor, Windsurf, etc.).

### 2. Drizzle Docs MCP Server (`src/mastra/mcp/drizzle-docs-mcp.ts`)

The core implementation that defines the tools and their logic:

- **`list_topics`**: Scrapes the Drizzle docs sidebar using `cheerio` to get a structured list of all available pages.
- **`fetch_page`**: Fetches HTML from `orm.drizzle.team`, cleans it, and converts it to Markdown using `TurndownService`.
- **`search_docs`**: Implements a client-side fuzzy search using `fuse.js` against the indexed slugs and titles.

### 3. Intelligent Caching

To minimize latency and avoid overloading the upstream documentation site:

- All topic titles and slugs are fetched and indexed at startup.
- Fetched Markdown content is cached in-memory with a TTL (Time-To-Live) mechanism.

## Data Flow

1. **Client Request**: An MCP client (like Cursor) calls a tool (e.g., `fetch_page`).
2. **MCP Router**: Mastra receives the request and routes it to the `drizzleDocsMcpServer`.
3. **Execution**:
   - If data is in cache, it's returned immediately.
   - If not, the server fetches the HTML, processes it into Markdown, and updates the cache.
4. **Response**: The structured response (JSON or Markdown) is sent back to the client via the selected transport (SSE or HTTP).

## Transports

The server supports two primary transports:

- **SSE (Server-Sent Events)**: Recommended for persistent connections in editors.
- **HTTP**: Best for one-off calls or CLI integration.

## Design Principles

- **AI-Optimized Content**: Content is stripped of navigation noise and converted to clean Markdown for better LLM comprehension.
- **Low Latency**: Pre-caching ensures search operations are near-instant.
- **Stability**: Using `zod` for input validation ensures the server is robust against malformed requests.
