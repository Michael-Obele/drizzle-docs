# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

A TypeScript **MCP server** for the Drizzle ORM documentation, built on
[`tmcp`](https://tmcp.io). Three tools (`list_topics`, `search_docs`,
`fetch_page`), two transports (stdio and Streamable HTTP), published to npm as
`drizzle-docs-mcp`.

> v1/v2 used Mastra. It was removed in v3 — do not add Mastra code, deps,
> scripts or docs back.

## Commands

**Bun only.** Never run or document `npm` / `pnpm` / `yarn` commands here.

```bash
bun install        # dependencies
bun run dev        # MCP over stdio, watch mode
bun run dev:http   # MCP over HTTP at localhost:3000/mcp
bun run check      # tsc --noEmit — run this after every edit
bun test           # tests (offline fixtures, no network)
bun run build      # emit dist/ (what npm ships)
```

### Dev servers and builds — ask first

- Do **not** start `bun run dev`, `bun run dev:http`, a Docker container or any
  other long-running server on your own initiative: ask which server/port the
  environment is already using, then use that.
- Do **not** run a build or a publish unless the task needs it — ask first.
- `bun run check` and `bun test` are always safe and expected.

## Project structure

| Path                           | What lives there                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `src/lib/config.ts`            | All configuration, read from env                                                                          |
| `src/lib/docs.ts`              | `llms.txt` catalogue, page fetch + Markdown conversion, `llms-full.txt` corpus, caching, dialect fallback |
| `src/lib/search.ts`            | Fuse.js indexes (fast + full-text) and snippet extraction                                                 |
| `src/tools/`                   | The three tools; `result.ts` holds the response helpers                                                   |
| `src/server.ts`                | `McpServer` assembly, capabilities, instructions                                                          |
| `src/index.ts`                 | Transport selection (stdio / HTTP)                                                                        |
| `tests/`                       | `bun test` suites — offline fixtures only                                                                 |
| `skills/drizzle-docs/SKILL.md` | The user-facing agent skill (source of truth)                                                             |
| `dist/`                        | Build output, git-ignored — never edit                                                                    |

## Conventions

- **TypeScript strict**, ES modules, `moduleResolution: NodeNext`: relative
  imports carry the `.js` extension even though the file is `.ts`.
- **Adding a tool**: create a module-level `zod` schema, then register it with
  `server.tool<typeof schema>({ name, title, description, schema, annotations },
handler)`. The explicit type argument is required — tmcp's `McpServer` generic
  is the adapter's schema type, so inference alone fails. Return
  `json(...)` / `text(...)` / `fail(...)` from `src/tools/result.ts`; never
  throw, MCP wants `isError: true`.
- **Tool descriptions are the UX**: they are what the model reads. Say what the
  tool does, when to reach for it, and what a good argument looks like.
- **Configuration over hardcoding**: hosts, paths and lists belong in
  `src/lib/config.ts` behind an env var with a bundled default.
- **No new dependencies** without asking — `tmcp`, `zod`, `cheerio`, `fuse.js`,
  `turndown`, `srvx` are the set.
- **Skills**: `skills/<name>/SKILL.md` is the single copy; `.agents/skills/`,
  `.agent/skills/` and `.windsurf/skills/` hold _relative symlinks_ to it. Never
  duplicate skill content across those folders.
- **Docs tone**: plain, simple words. No hype, no clever phrasing.

## Verification before you say "done"

```bash
bun run check && bun test
```

Add a test for anything new in `src/lib/` (parsers, search, fallbacks). Only run
`bun run build` when the change has to ship, and ask first.

## Skills in this repo

- **drizzle-docs** — how to use this server's own tools. Symlinked into
  `.agents/skills/`, `.agent/skills/` and `.windsurf/skills/`.
