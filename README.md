# drizzle-docs-mcp

[![latest release](https://img.shields.io/github/v/tag/Michael-Obele/drizzle-docs?sort=semver)](https://github.com/Michael-Obele/drizzle-docs/releases)
[![npm version](https://img.shields.io/npm/v/drizzle-docs-mcp.svg)](https://www.npmjs.com/package/drizzle-docs-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP server that gives your AI assistant the whole Drizzle ORM documentation:
**446 pages across 6 SQL dialects**, with typo-tolerant search and full-text
search, served as clean Markdown.

- Built on [`tmcp`](https://tmcp.io) — no framework baggage, just tools.
- Two ways to run it: **npm** (`npx drizzle-docs-mcp`, stdio) and **https**
  (Streamable HTTP, host it yourself with Docker or plain Node/Bun).
- Reads `orm.drizzle.team/llms.txt` for the catalogue and `llms-full.txt` for
  content search, so it follows the real docs structure instead of scraping a
  sidebar and guessing.

## Connect

### 1. npm (stdio) — nothing to install

```bash
npx -y drizzle-docs-mcp        # Node
bunx drizzle-docs-mcp          # Bun
```

Or add it to your editor's MCP config:

```json
{
  "mcpServers": {
    "drizzle-docs": {
      "command": "npx",
      "args": ["-y", "drizzle-docs-mcp"]
    }
  }
}
```

<details>
<summary>Cursor / Windsurf / VS Code / Claude Code / Zed</summary>

**Cursor** — Settings → MCP → _Add new MCP server_:

```json
{
  "drizzle-docs": {
    "command": "npx",
    "args": ["-y", "drizzle-docs-mcp"]
  }
}
```

**Windsurf** — `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "drizzle-docs": { "command": "npx", "args": ["-y", "drizzle-docs-mcp"] }
  }
}
```

**VS Code (Copilot)** — `.vscode/mcp.json` or the `MCP: Add Server` command:

```json
{
  "servers": {
    "drizzle-docs": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "drizzle-docs-mcp"]
    }
  }
}
```

**Claude Code**

```bash
claude mcp add drizzle-docs -- npx -y drizzle-docs-mcp
```

**Zed** — `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "drizzle-docs": {
      "command": { "path": "npx", "args": ["-y", "drizzle-docs-mcp"] }
    }
  }
}
```

</details>

### 2. https (Streamable HTTP) — host it yourself

The same server can listen on a port. Set `MCP_TRANSPORT=http` (or pass
`--http`) and the MCP endpoint is served at `/mcp`:

```bash
docker build -t drizzle-docs-mcp .
docker run --rm -p 3000:3000 drizzle-docs-mcp
curl http://localhost:3000/        # {"name":"drizzle-docs-mcp","version":"3.0.0",…}
```

Without Docker:

```bash
bun install && bun run build
node dist/index.js --http          # PORT, HOST, MCP_PATH come from the env
```

Then point a client at it:

```json
{
  "mcpServers": {
    "drizzle-docs": { "type": "http", "url": "https://<your-host>/mcp" }
  }
}
```

Runs on Node 22+ or Bun, so any container platform, VM or PaaS works —
`tmcp` speaks plain Web `Request`/`Response`, which is why the same code serves
stdio locally and HTTP remotely.

> [!NOTE]
> v2 ran on Mastra Cloud (`drizzle.mastra.cloud`). That endpoint is retired —
> use `npx` for local use, or self-host for a shared URL. See
> [CHANGELOG.md](CHANGELOG.md).

## Tools

| Tool          | What it does                                                                                   | Arguments                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `list_topics` | Browse the catalogue. No arguments returns the map: every dialect, every section, page counts. | `dialect`, `section`, `limit` (60), `offset`                                             |
| `search_docs` | Find a page, or the answer inside the pages.                                                   | `query`, `depth` (`index` \| `full`), `dialect`, `section`, `limit` (10)                 |
| `fetch_page`  | Read one page as clean Markdown (nav, sidebars and footers stripped).                          | `slug`, `sections`, `maxLength`, `format` (`markdown` \| `json` \| `plaintext`), `fresh` |

- **`depth: "index"`** (default) fuzzy-searches titles, slugs and sections
  straight from `llms.txt` — instant, and it tolerates typos (`migraton`
  finds _Migrations_).
- **`depth: "full"`** downloads `llms-full.txt` once (a few MB) and searches
  the actual page text, returning a `snippet` around each match. Use it when
  you need the answer, not a link.
- Slugs look like `docs/pg/select`. Some catalogue links point at pages the
  site serves without the dialect segment (`/docs/pg/overview` →
  `/docs/overview`) — `fetch_page` retries the unprefixed URL and repairs the
  catalogue, so you never have to care.

Ask your assistant things like:

- "How do I set up a Postgres schema in Drizzle?"
- "Which migration pages exist for SQLite?"
- "Show me the batch API examples" → `search_docs { query: "batch api", depth: "full" }`

## Skills

The repo ships an agent skill that teaches your assistant _how_ to use these
tools (when to use which one, and the gotchas above). Install it:

```bash
# From the skills registry (same pattern as DocShark)
npx skills add Michael-Obele/drizzle-docs --skill drizzle-docs
```

Or by hand into the standard skill folder:

```bash
mkdir -p ~/.agents/skills/drizzle-docs
curl -fsSL https://raw.githubusercontent.com/Michael-Obele/drizzle-docs/master/skills/drizzle-docs/SKILL.md \
  -o ~/.agents/skills/drizzle-docs/SKILL.md
```

- GitHub Copilot and OpenCode read `~/.agents/skills/` automatically.
- Claude Code: `ln -s ../../.agents/skills/drizzle-docs ~/.claude/skills/drizzle-docs`
- In this repo the skill lives in `skills/drizzle-docs/` and is symlinked into
  `.agents/`, `.agent/` and `.windsurf/`, so every supported editor picks it up
  from a clone.

## Also: DocShark

This server answers one site — Drizzle's. If you work across many
documentation sites, use **[DocShark](https://github.com/Michael-Obele/docshark)**
(our own docs MCP, also built on `tmcp`): it crawls any docs site, stores it in
SQLite with FTS5/BM25 search, and lets your assistant query the latest pages.

```bash
bun add -g docshark

docshark add https://orm.drizzle.team/ --depth 2   # index a site
docshark search "relational queries"               # CLI search
docshark list                                      # what is indexed
docshark stale                                     # refresh anything >14 days old
```

Add it to your MCP config:

```json
{
  "mcpServers": {
    "docshark": {
      "command": "bunx",
      "args": ["-y", "docshark", "start", "--stdio"]
    }
  }
}
```

Its agent skills are one command away too:

```bash
npx skills add Michael-Obele/docshark --skill docshark
npx skills add Michael-Obele/docshark --skill using-docshark
```

Use them together: `drizzle-docs-mcp` for instant, always-fresh Drizzle
answers, DocShark for everything else you index. See
[DocShark on GitHub →](https://github.com/Michael-Obele/docshark).

## Configuration

All optional — defaults work out of the box.

| Env var             | Default                    | Meaning                                  |
| ------------------- | -------------------------- | ---------------------------------------- |
| `DOCS_BASE_URL`     | `https://orm.drizzle.team` | Docs site (or your own mirror) to read   |
| `DOCS_CACHE_TTL_MS` | `3600000`                  | How long a page/index stays cached (1 h) |
| `MCP_TRANSPORT`     | `stdio`                    | `stdio` or `http` (same as `--http`)     |
| `PORT`              | `3000`                     | HTTP port                                |
| `HOST`              | `0.0.0.0`                  | HTTP bind address                        |
| `MCP_PATH`          | `/mcp`                     | HTTP MCP endpoint path                   |

## Local development

```bash
bun install          # dependencies
bun run dev          # stdio, watch mode
bun run dev:http     # HTTP on :3000/mcp
bun run check        # tsc --noEmit
bun test             # parser + search tests (offline fixtures)
bun run build        # emit dist/ (this is what npm ships)
```

## Publishing a release

One push of a version tag runs `.github/workflows/release.yml`, which
typechecks, tests, builds, then publishes to npm and cuts a GitHub release:

```bash
# 1. bump "version" in package.json
bun run build        # sanity check locally
git commit -am "chore: release vX.Y.Z"
git tag vX.Y.Z && git push origin vX.Y.Z
```

The workflow refuses to publish if the tag does not match `package.json`, and
`prepublishOnly` re-runs `check` + `test` + `build` before `npm publish`.

### npm provenance

Every release from `3.0.1` on ships with a [provenance
attestation](https://docs.npmjs.com/generating-provenance-statements/): the
tarball is tied to this public repository through GitHub's OIDC identity and
signed by Sigstore, so anyone can check where it was built. **No npm token is
involved at any point.**

The workflow does its half — `permissions: id-token: write` on the publish job,
a GitHub-hosted runner, `npm publish --provenance --access public` — and
`package.json` carries the matching public `repository` field, which npm checks
case-sensitively.

#### Why there is a step that deletes a token

`actions/setup-node` with `registry-url` writes
`//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}` into the runner's
`.npmrc`. Trusted publishing deliberately has no `NODE_AUTH_TOKEN`, so that
placeholder expands to an empty string — and npm reads an empty token as *auth
is configured*, which stops it from starting the OIDC exchange. The publish
then fails with `ENEEDAUTH` even though the trusted publisher is set up
perfectly. The `Drop the placeholder token` step deletes the line so OIDC can
take over. Leave it in; removing it looks like a cleanup but breaks releases.

#### 1. First publish — a login, not a token

`3.0.0` was published by hand, because npm refuses to trust a workflow for a
package that does not exist yet (`npm trust`: *"Package must exist"*):

```bash
npm login                 # browser + 2FA: a session, not a token
npm publish --access public   # prepublishOnly runs check + test + build
npm logout                # leave no credential on disk
```

That one version carries **no provenance** — attestations can only be minted in
CI, and CI cannot be trusted for a package that does not exist yet.

#### 2. Trust the workflow (still no token)

```bash
npm trust github drizzle-docs-mcp \
  --file release.yml \
  --repo Michael-Obele/drizzle-docs \
  --allow-publish
```

Needs npm ≥ 11.15, 2FA on the account and write access to the package; tokens
with *bypass 2FA* are deliberately not accepted here. The same setting lives on
the website: Packages → `drizzle-docs-mcp` → Settings → **Trusted Publisher** →
GitHub Actions → `Michael-Obele` / `drizzle-docs` / `release.yml`. If you use the
website, tick **`npm publish`** — new connections default to `npm stage publish`
only, which this workflow does not use.

#### 3. Lock it down

Settings → **Publishing access** → *Require two-factor authentication and
disallow tokens*. Only the trusted publisher can publish after that.

#### 4. Release

```bash
bun version patch         # 3.0.1 -> 3.0.2
git tag vX.Y.Z && git push origin vX.Y.Z
```

npm authenticates the job through OIDC and generates the provenance attestation
by itself.

Check a published version:

```bash
npm view drizzle-docs-mcp dist.attestations   # Sigstore attestation link
npm audit signatures                          # verify attestations locally
```

The package page on npmjs.com shows the provenance badge.

## Architecture

- [`MCP_ARCHITECTURE.md`](MCP_ARCHITECTURE.md) — how the server, the data layer
  and the transports fit together.
- `src/lib/docs.ts` — catalogue (`llms.txt`), page fetching + Markdown
  conversion, full corpus (`llms-full.txt`), caching.
- `src/lib/search.ts` — Fuse.js indexes for the fast and the deep search.
- `src/tools/` — the three tools.
- `src/server.ts` + `src/index.ts` — server assembly and transport selection.

## Contributing

Read the [Contributing Guidelines](CONTRIBUTING.md) and
[Code of Conduct](CODE_OF_CONDUCT.md) first. Issues and security reports go to
[Security](SECURITY.md).

## License

[MIT](LICENSE)

## Contact

- **Issues & Support**: support@svelte-apps.me
- **Contributions**: contrib@svelte-apps.me
- **Maintainer**: Michael Amachree (michael@svelte-apps.me)
