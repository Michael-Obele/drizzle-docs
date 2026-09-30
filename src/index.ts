#!/usr/bin/env node
/**
 * drizzle-docs-mcp entrypoint.
 *
 *   stdio (default) — for `npx drizzle-docs-mcp` and editor MCP configs:
 *     drizzle-docs-mcp
 *
 *   http — for a self-hosted remote endpoint:
 *     drizzle-docs-mcp --http        (or MCP_TRANSPORT=http)
 *
 * Only the HTTP path may write to stdout; stdio mode logs to stderr because
 * stdout carries the JSON-RPC protocol.
 */
import { HttpTransport } from "@tmcp/transport-http";
import { StdioTransport } from "@tmcp/transport-stdio";
import { serve } from "srvx";
import { config } from "./lib/config.js";
import { createServer, serverInfo } from "./server.js";

const server = createServer();

const wantsHttp =
  process.argv.includes("--http") || config.transport === "http";

if (wantsHttp) {
  const transport = new HttpTransport(server, {
    path: config.httpPath,
    // Public, read-only docs: let browser based MCP clients connect.
    cors: true,
    allowedOrigins: true,
  });

  serve({
    port: config.port,
    hostname: config.host,
    fetch: async (request: Request): Promise<Response> => {
      const url = new URL(request.url);

      // Small landing page so a human hitting the host knows what it is.
      if (url.pathname === "/" || url.pathname === "/health") {
        return Response.json({
          name: serverInfo.name,
          version: serverInfo.version,
          status: "ok",
          transport: "http",
          endpoint: config.httpPath,
          docs: "https://github.com/Michael-Obele/drizzle-docs",
        });
      }

      const response = await transport.respond(request);
      return response ?? new Response("Not found", { status: 404 });
    },
  });

  console.error(
    `[${serverInfo.name}] MCP over HTTP: http://${config.host}:${config.port}${config.httpPath}`,
  );
} else {
  // Stdout belongs to the protocol from here on.
  new StdioTransport(server).listen();
}

// Warm the docs catalogue in the background so the first search is instant.
// Failures are swallowed — the tools retry and report errors themselves.
if (wantsHttp) {
  void import("./lib/docs.js")
    .then((docs) => docs.fetchIndex())
    .then((index) =>
      console.error(
        `[${serverInfo.name}] indexed ${index.entries.length} pages from ${index.source}`,
      ),
    )
    .catch((error: unknown) =>
      console.error(
        `[${serverInfo.name}] warm-up skipped:`,
        error instanceof Error ? error.message : error,
      ),
    );
}
