# Self-hosted remote endpoint (Streamable HTTP) — the "https" half of the
# distribution, next to the npm/stdio package.
#
#   docker build -t drizzle-docs-mcp .
#   docker run --rm -p 3000:3000 drizzle-docs-mcp
#   curl http://localhost:3000/mcp            # MCP endpoint
#
# Bun runs the TypeScript sources directly, so no build stage is needed.
FROM oven/bun:1-alpine

WORKDIR /app

# Install runtime dependencies first so source edits do not bust the layer.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src

ENV MCP_TRANSPORT=http \
    PORT=3000 \
    HOST=0.0.0.0 \
    MCP_PATH=/mcp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1

CMD ["bun", "run", "src/index.ts", "--http"]
