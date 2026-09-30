import { createRequire } from "node:module";
import { McpServer } from "tmcp";
import { ZodJsonSchemaAdapter } from "@tmcp/adapter-zod";
import { registerFetchPage } from "./tools/fetch-page.js";
import { registerListTopics } from "./tools/list-topics.js";
import { registerSearchDocs } from "./tools/search-docs.js";

const require = createRequire(import.meta.url);

/**
 * The package manifest doubles as the server manifest (name, version,
 * description), so there is only ever one version string in the repo — the
 * `version` npm publishes is the version the MCP client reports.
 */
const pkg = require("../package.json") as {
  name: string;
  version: string;
  description: string;
};

export const serverInfo = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
};

const INSTRUCTIONS = [
  "Read-only access to the official Drizzle ORM documentation (orm.drizzle.team).",
  "Nothing here writes, changes or executes anything — every answer comes from the live docs.",
  "",
  "Typical flow:",
  '1. search_docs to find the page: depth "index" when you just need the right page, depth "full" when you need the actual content (it returns a snippet).',
  "2. fetch_page with that slug to read the whole page as Markdown (use `sections`/`maxLength` to keep it small).",
  "3. list_topics when the user asks what documentation exists — no arguments gives the dialect + section map, a `dialect`/`section` gives the pages in it.",
  "",
  'Slugs look like "docs/pg/select". Dialects: pg, mysql, sqlite, mssql, cockroach, singlestore.',
].join("\n");

/**
 * Build the MCP server.
 *
 * The server itself is transport agnostic (plain JSON-RPC over Web standards);
 * the entrypoint decides whether it speaks stdio or Streamable HTTP.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: serverInfo.name,
      version: serverInfo.version,
      description: serverInfo.description,
    },
    {
      adapter: new ZodJsonSchemaAdapter(),
      capabilities: {
        tools: {},
      },
      instructions: INSTRUCTIONS,
    },
  );

  registerListTopics(server);
  registerSearchDocs(server);
  registerFetchPage(server);

  return server;
}
