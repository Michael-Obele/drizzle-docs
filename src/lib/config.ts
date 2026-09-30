/**
 * Runtime configuration for the Drizzle docs MCP server.
 *
 * Every value is environment driven so the server can be pointed at a docs
 * mirror (or a fork of the docs) without touching the code. Defaults are
 * bundled so a plain `npx drizzle-docs-mcp` works with no setup.
 */

/** Strip any trailing slashes so `${baseUrl}/llms.txt` never doubles up. */
const trimSlash = (value: string): string => value.replace(/\/+$/, "");

const env = typeof process === "undefined" ? {} : process.env;

export const config = {
  /** Base URL of the Drizzle docs site (no trailing slash). */
  baseUrl: trimSlash(env.DOCS_BASE_URL ?? "https://orm.drizzle.team"),

  /** How long a fetched page or index stays in memory before a refetch. */
  cacheTtlMs: Number(env.DOCS_CACHE_TTL_MS ?? 60 * 60 * 1000),

  /** Transport: `stdio` (default, editors/CLI) or `http` (self-hosted). */
  transport: (env.MCP_TRANSPORT ?? "stdio").toLowerCase(),

  /** Port the HTTP transport listens on (srvx also reads PORT itself). */
  port: Number(env.PORT ?? 3000),

  /** Host the HTTP transport binds to. */
  host: env.HOST ?? "0.0.0.0",

  /** Path the Streamable HTTP MCP endpoint is mounted on. */
  httpPath: env.MCP_PATH ?? "/mcp",
};

/** Machine readable index of every page: sections, titles, slugs. */
export const llmsTxtUrl = `${config.baseUrl}/llms.txt`;

/** The whole documentation set as one Markdown file (used by depth: "full"). */
export const llmsFullTxtUrl = `${config.baseUrl}/llms-full.txt`;
