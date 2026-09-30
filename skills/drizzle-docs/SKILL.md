---
name: drizzle-docs
description: "Look up Drizzle ORM documentation through the drizzle-docs MCP server — browse pages by SQL dialect and section, fuzzy or full-text search, and fetch clean Markdown. Use when the user asks about Drizzle ORM, drizzle-kit, migrations, relations, relational queries, column types, drivers, or any Drizzle API, or when a drizzle-docs MCP server is connected."
---

# drizzle-docs

Read-only access to the official Drizzle ORM docs at `orm.drizzle.team`.
The catalogue holds **446 pages across 6 SQL dialects** (`pg`, `mysql`,
`sqlite`, `mssql`, `cockroach`, `singlestore`) plus shared `general` pages.

Nothing here writes or changes anything — every answer comes from the live docs
site, cached for one hour.

## Connect the server

Pick one:

```bash
# Local stdio (no install, works with any MCP client)
npx drizzle-docs-mcp
# or, with Bun
bunx drizzle-docs-mcp
```

```json
{ "drizzle-docs": { "type": "stdio", "command": "npx", "args": ["-y", "drizzle-docs-mcp"] } }
```

Self-hosted remote endpoint (Streamable HTTP):

```bash
docker build -t drizzle-docs-mcp .
docker run --rm -p 3000:3000 drizzle-docs-mcp
# MCP endpoint: http://localhost:3000/mcp
```

## The three tools

| Tool | Use it when | Key arguments |
| --- | --- | --- |
| `list_topics` | "what docs exist for X?" | no args → the whole map (dialects, sections, counts); `dialect`, `section`, `limit`, `offset` → the pages in that slice |
| `search_docs` | "which page answers this?" | `query`, `depth` (`"index"` fast / `"full"` content search with snippets), `dialect`, `section`, `limit` |
| `fetch_page` | "show me the page" | `slug` (or full URL), `sections`, `maxLength`, `format`, `fresh` |

All three return JSON text (`fetch_page` returns raw Markdown by default).

## Recipe

1. `search_docs` with a short query — `depth: "index"` is instant and is
   enough to pick a page.
2. Read the returned `slug`, then `fetch_page` on it.
3. Keep the context small: `fetch_page` with `sections: ["Examples"]` or
   `maxLength: 4000` instead of the whole page.
4. Reach for `depth: "full"` when you need the actual answer in the docs
   (it downloads `llms-full.txt`, a few MB, once per hour) — it returns a
   `snippet` around each match, so you often do not need step 2 and 3.
5. "What does Drizzle support for Postgres migrations?" → `list_topics`
   `{ dialect: "pg", section: "Migrations" }`, then fetch what looks relevant.

## Things that bite

- **Slugs look like `docs/pg/select`.** Some catalogue links carry a dialect
  segment the site does not serve (`/docs/pg/overview` 404s). `fetch_page`
  retries the unprefixed URL automatically and repairs the catalogue, so a
  slug that 404s as a URL still works as a slug.
- **Titles come from the page `h1`**, not the browser tab title.
- **Results are cached for an hour.** Pass `fresh: true` to `fetch_page` if
  you suspect the page changed.
- **Zero results?** Drop the filters, use fewer words, or switch to
  `depth: "full"`. `list_topics` with no arguments always shows what exists.

## Configuration (all optional)

| Env var | Default | Meaning |
| --- | --- | --- |
| `DOCS_BASE_URL` | `https://orm.drizzle.team` | Docs site (or a mirror) to read |
| `DOCS_CACHE_TTL_MS` | `3600000` | Cache lifetime |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` (`--http` also works) |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | HTTP listener |
| `MCP_PATH` | `/mcp` | HTTP MCP endpoint path |

Full setup, editor configs and publishing notes: the project README at
<https://github.com/Michael-Obele/drizzle-docs>.
