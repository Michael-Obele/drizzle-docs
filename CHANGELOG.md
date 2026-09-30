# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-09-30

Migrated from Mastra to [`tmcp`](https://tmcp.io) and started publishing to npm.

### Added
- **npm distribution**: published as `drizzle-docs-mcp`, so `npx -y drizzle-docs-mcp` runs it with nothing installed. The `bin` points at the compiled `dist/`.
- **Streamable HTTP transport**: `--http` (or `MCP_TRANSPORT=http`) serves the same server at `/mcp` for a self-hosted https endpoint, plus `/` info + health JSON. `Dockerfile` and `.dockerignore` included.
- **Release and CI workflows**: `.github/workflows/release.yml` typechecks, tests, builds, publishes to npm with provenance and cuts a GitHub release on a `v*` tag — it refuses to publish when the tag does not match `package.json`. `ci.yml` runs the same checks on pushes and pull requests.
- **Agent skill** at `skills/drizzle-docs/SKILL.md`, symlinked into `.agents/`, `.agent/` and `.windsurf/`, with install instructions in the README.
- **Catalogue tools built on Drizzle's own `llms.txt` / `llms-full.txt`** instead of scraped sidebars.
- Tests (`bun test`) covering the llms.txt parser, dialect fallback, full-corpus parsing, search and section extraction.

### Changed
- `list_topics` returns the catalogue (dialects, sections, page counts) instead of dumping every page, and accepts `dialect`, `section`, `limit`, `offset`. Drizzle now has **446 pages across 6 SQL dialects**, not 97 pages.
- `search_docs` gained `depth: "full"` — a content search over `llms-full.txt` that returns a snippet around each match — plus `dialect`/`section` filters. The fast path builds its index from `llms.txt`, so the first search no longer downloads every page.
- `fetch_page` returns raw Markdown by default, takes `fresh`, prefers the page `h1` for the title, and retries the unprefixed URL for the 71 catalogue links that 404 (`/docs/pg/overview` → `/docs/overview`), repairing the catalogue after the first hit.
- The server version is read from `package.json`, so the published version and the MCP `serverInfo` can no longer drift (`scripts/sync-versions.ts` removed).
- Everything is env-driven: `DOCS_BASE_URL`, `DOCS_CACHE_TTL_MS`, `MCP_TRANSPORT`, `PORT`, `HOST`, `MCP_PATH`.

### Removed
- The Mastra runtime, agents, workflows, scorers, Mastra Studio scripts and the Mastra agent skill.
- Mastra Cloud endpoints (`drizzle.mastra.cloud`) and the SSE transport guidance — the MCP spec deprecated SSE; use Streamable HTTP.

### Fixed
- The sidebar fallback no longer re-parses the whole document inside its sort comparator (listing was quadratic).
- `llms-full.txt` snippets no longer begin with MDX `import` lines and component tags.

## [2.0.0] - 2026-02-10

### Added
- **Production-grade Documentation**: Complete overhaul of `README.md` with Cursor install deep-links and deployment guides.
- **Repository Standards**: Added `CODE_OF_CONDUCT.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, and `SECURITY.md`.
- **Architecture Guide**: Added `MCP_ARCHITECTURE.md` explaining the Mastra-based design.
- **Smart Caching**: Implemented startup pre-caching for all 97 Drizzle documentation pages.
- **Improved Search**: Added high-sensitivity fuzzy search powered by `fuse.js`.
- **Versioning System**: Added automated version synchronization scripts and GitHub release workflows.

### Changed
- Refined contact information to use dedicated `@svelte-apps.me` addresses.
- Updated MCP server version to 2.0.0 to reflect production readiness.

## [1.0.0] - 2026-01-15

### Added
- Initial implementation of Drizzle Docs MCP server.
- Basic tools for listing and fetching documentation.
- Mastra framework integration.
