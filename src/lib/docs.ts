import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { config, llmsFullTxtUrl, llmsTxtUrl } from "./config.js";

// ============================================================================
// Types
// ============================================================================

/** One page in the documentation catalogue. */
export interface DocEntry {
  title: string;
  /** Page slug relative to the docs base URL, e.g. `docs/pg/select`. */
  slug: string;
  /** Absolute URL of the page. */
  url: string;
  /** SQL dialect the page belongs to, or `general` for shared pages. */
  dialect: string;
  /** Section inside llms.txt with the dialect prefix removed, e.g. `Migrations`. */
  section: string;
}

/** How many pages sit in one `dialect` + `section` slice. */
export interface DocsSection {
  dialect: string;
  section: string;
  count: number;
}

/** The parsed docs catalogue. */
export interface DocIndex {
  source: string;
  entries: DocEntry[];
  dialects: string[];
  sections: DocsSection[];
  fetchedAt: number;
}

/** A single fetched page, already converted to Markdown. */
export interface DocPage {
  title: string;
  slug: string;
  url: string;
  markdown: string;
  fetchedAt: number;
}

/** One page pulled out of `llms-full.txt`. */
export interface FullDoc {
  title: string;
  slug: string;
  url: string;
  markdown: string;
}

// ============================================================================
// Small helpers
// ============================================================================

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});

/** Turn a slug or absolute URL into an absolute URL on the docs host. */
export function toAbsoluteUrl(input: string): string {
  if (/^https?:\/\//.test(input)) return input;
  return `${config.baseUrl}/${input.replace(/^\//, "")}`;
}

/** Turn an absolute URL into the slug used by every tool (`docs/pg/select`). */
export function toSlug(url: string): string {
  if (url.startsWith(`${config.baseUrl}/`)) {
    return url.slice(config.baseUrl.length + 1);
  }
  return url.replace(/^https?:\/\/[^/]+\//, "");
}

/** Dialect implied by the URL path: `docs/pg/select` -> `pg`. */
function dialectFromUrl(slug: string, prefixes: Set<string>): string {
  const parts = slug.split("/");
  if (parts[0] === "docs" && parts.length > 2 && prefixes.has(parts[1])) {
    return parts[1];
  }
  return "general";
}

// ============================================================================
// llms.txt — the docs catalogue (fast path)
// ============================================================================

const SECTION_RE = /^##\s+(.+)$/;
const DIALECT_SECTION_RE = /^([a-z0-9_-]+)\//i;
const ENTRY_RE = /^-\s+\[([^\]]+)\]\(([^)\s]+)\)/;

/**
 * Parse the official `llms.txt` into a catalogue.
 *
 * Drizzle groups pages like `## pg/Migrations` — a SQL dialect followed by a
 * section name — plus ungrouped pages under plain headings such as
 * `## meet drizzle`. Both shapes are normalised into `{dialect, section}`.
 */
export function parseLlmsTxt(text: string, source = llmsTxtUrl): DocIndex {
  const lines = text.split(/\r?\n/);

  // First pass: collect the dialect prefixes that actually exist in the file,
  // so the dialect list is derived from the data instead of being hardcoded.
  const prefixes = new Set<string>();
  for (const line of lines) {
    const match = line.match(SECTION_RE);
    if (!match) continue;
    const prefix = match[1].trim().match(DIALECT_SECTION_RE);
    if (prefix) prefixes.add(prefix[1]);
  }

  const entries: DocEntry[] = [];
  const counts = new Map<string, DocsSection>();
  const dialects: string[] = [];
  const seenDialects = new Set<string>();

  let headingDialect = "general";
  let sectionName = "";

  const note = (dialect: string, section: string): void => {
    const key = `${dialect}\u0000${section}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    counts.set(key, { dialect, section, count: 1 });
  };

  for (const line of lines) {
    const heading = line.match(SECTION_RE);
    if (heading) {
      const raw = heading[1].trim();
      const prefix = raw.match(DIALECT_SECTION_RE);
      if (prefix) {
        headingDialect = prefix[1];
        sectionName = raw.slice(prefix[0].length).trim();
      } else {
        headingDialect = "general";
        sectionName = raw;
      }
      continue;
    }

    const entry = line.match(ENTRY_RE);
    if (!entry) continue;

    const title = entry[1].trim();
    const url = entry[2].trim();
    const slug = toSlug(url);
    const dialect =
      headingDialect === "general"
        ? dialectFromUrl(slug, prefixes)
        : headingDialect;
    const section = sectionName || "Docs";

    entries.push({ title, slug, url, dialect, section });
    note(dialect, section);

    if (!seenDialects.has(dialect)) {
      seenDialects.add(dialect);
      dialects.push(dialect);
    }
  }

  return {
    source,
    entries,
    dialects,
    sections: [...counts.values()],
    fetchedAt: Date.now(),
  };
}

// ============================================================================
// Fallback — scrape the sidebar when llms.txt is unavailable
// ============================================================================

interface SidebarLink {
  title: string;
  url: string;
  order: number;
}

async function scrapeSidebar(): Promise<DocIndex> {
  const url = `${config.baseUrl}/docs/overview`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch docs sidebar: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const links: SidebarLink[] = [];

  // One pass over the DOM (the previous implementation re-parsed the whole
  // document inside its sort comparator, which made listing quadratic).
  $("a[data-nav-index]").each((_, element) => {
    const link = $(element);
    const href = link.attr("href");
    const title = link.text().trim();
    if (!href || !title) return;
    if (!href.startsWith("/docs/") && !href.startsWith("#")) return;
    links.push({
      title,
      url: href.startsWith("#") ? `${config.baseUrl}/docs/overview${href}` : `${config.baseUrl}${href}`,
      order: Number.parseInt(link.attr("data-nav-index") ?? "-1", 10),
    });
  });

  links.sort((a, b) => a.order - b.order);

  const seen = new Set<string>();
  const entries: DocEntry[] = [];
  for (const link of links) {
    const url = link.url;
    if (seen.has(url)) continue;
    seen.add(url);
    const slug = toSlug(url);
    entries.push({
      title: link.title,
      slug,
      url,
      dialect: dialectFromUrl(slug, new Set()),
      section: "Docs",
    });
  }

  return {
    source: `${config.baseUrl}/docs/overview (sidebar fallback)`,
    entries,
    dialects: ["general"],
    sections: [{ dialect: "general", section: "Docs", count: entries.length }],
    fetchedAt: Date.now(),
  };
}

// ============================================================================
// Public data API (memory cached with a TTL)
// ============================================================================

let indexCache: DocIndex | null = null;
let indexInflight: Promise<DocIndex> | null = null;
const pageCache = new Map<string, DocPage>();
let fullCache: FullDoc[] | null = null;
let fullFetchedAt = 0;

const isFresh = (fetchedAt: number): boolean =>
  Date.now() - fetchedAt < config.cacheTtlMs;

/** Fetch (and cache) the docs catalogue. Falls back to the HTML sidebar. */
export async function fetchIndex(
  options: { fresh?: boolean } = {},
): Promise<DocIndex> {
  if (!options.fresh && indexCache && isFresh(indexCache.fetchedAt)) {
    return indexCache;
  }
  if (indexInflight) return indexInflight;

  indexInflight = (async () => {
    try {
      const response = await fetch(llmsTxtUrl, {
        headers: { accept: "text/plain" },
      });
      if (!response.ok) throw new Error(`llms.txt -> ${response.status}`);
      const index = parseLlmsTxt(await response.text(), llmsTxtUrl);
      if (index.entries.length === 0) {
        throw new Error("llms.txt contained no entries");
      }
      indexCache = index;
      return index;
    } catch (error) {
      console.error(
        "[drizzle-docs-mcp] llms.txt unavailable, using the sidebar fallback:",
        error instanceof Error ? error.message : error,
      );
      const index = await scrapeSidebar();
      indexCache = index;
      return index;
    } finally {
      indexInflight = null;
    }
  })();

  return indexInflight;
}

/**
 * Candidate URLs for one page, most likely first.
 *
 * `llms.txt` lists shared pages under every dialect section
 * (`/docs/pg/overview`) even though the site only serves them unprefixed
 * (`/docs/overview`) — 71 of the 446 catalogue links are like that. After a
 * 404 we retry once with the dialect segment removed, but only when the
 * catalogue itself reports that segment as a dialect, so a genuine deep path
 * such as `/docs/get-started/postgresql-new` is never rewritten.
 */
/**
 * The unprefixed URL to try after a `llms.txt` dialect link 404s, or `null`
 * when the path holds no dialect segment the catalogue recognises.
 */
export function dialectFallbackUrl(
  url: string,
  dialects: string[],
): string | null {
  let parts: string[];
  try {
    parts = new URL(url).pathname.split("/");
  } catch {
    return null;
  }
  // ["", "docs", "<dialect>", "<page>"]
  if (parts[1] !== "docs" || parts.length < 4 || !parts[3]) return null;

  const segment = parts[2];
  if (!segment || segment === "general" || !dialects.includes(segment)) {
    return null;
  }

  return `${config.baseUrl}/docs/${parts.slice(3).join("/")}`;
}

async function pageCandidates(url: string): Promise<string[]> {
  const candidates = [url];
  const dialects = (await fetchIndex().catch(() => null))?.dialects ?? [];
  const fallback = dialectFallbackUrl(url, dialects);
  if (fallback) candidates.push(fallback);
  return candidates;
}

/** Teach the catalogue the URL that actually serves a page. */
function repairEntry(slug: string, canonicalSlug: string, url: string): void {
  if (!indexCache || slug === canonicalSlug) return;
  const entry = indexCache.entries.find((item) => item.slug === slug);
  if (!entry) return;
  entry.slug = canonicalSlug;
  entry.url = url;
}

/** Fetch one documentation page as clean Markdown (cached for one hour). */
export async function fetchPage(
  input: string,
  options: { fresh?: boolean } = {},
): Promise<DocPage> {
  const requestedUrl = toAbsoluteUrl(input);
  const requestedSlug = toSlug(requestedUrl);

  const cached = pageCache.get(requestedSlug);
  if (!options.fresh && cached && isFresh(cached.fetchedAt)) return cached;

  const candidates = await pageCandidates(requestedUrl);
  let response: Response | null = null;
  let url = requestedUrl;

  for (const candidate of candidates) {
    const res = await fetch(candidate, { headers: { accept: "text/html" } });
    if (res.ok) {
      response = res;
      url = candidate;
      break;
    }
    if (res.status !== 404) {
      throw new Error(`Failed to fetch ${candidate} (${res.status})`);
    }
  }

  if (!response) {
    const tried = candidates.map(toSlug).join(", ");
    throw new Error(
      `Documentation page not found: ${requestedSlug} (tried ${tried})`,
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // The <title> is site-wide ("Drizzle ORM - Why Drizzle?"), so prefer the h1.
  const title = ($("h1").first().text() || $("title").text() || "Untitled")
    .replace(/\s+/g, " ")
    .trim();

  $(
    "nav, aside, header, footer, script, style, noscript, [data-nav], [data-sidebar], [role='navigation'], [class*='sidebar'], [class*='TableOfContents'], [class*='table-of-contents']",
  ).remove();

  const root = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("[data-content], .prose, .content").first();

  const contentHtml = root.length ? root.html() : $.html();
  if (!contentHtml) throw new Error(`No content found on ${url}`);

  const slug = toSlug(url);
  const page: DocPage = {
    title,
    slug,
    url,
    markdown: turndown.turndown(contentHtml),
    fetchedAt: Date.now(),
  };

  pageCache.set(requestedSlug, page);
  if (slug !== requestedSlug) pageCache.set(slug, page);
  repairEntry(requestedSlug, slug, url);
  return page;
}

/** Parse `llms-full.txt`: pages are separated by `Source: <url>` markers. */
export function parseLlmsFullTxt(text: string): FullDoc[] {
  const docs: FullDoc[] = [];
  let current: { url: string; lines: string[] } | null = null;

  const flush = (): void => {
    if (!current) return;
    const markdown = current.lines.join("\n").trim();
    const slug = toSlug(current.url);
    if (markdown) {
      const heading = markdown.match(/^#\s+(.+)$/m);
      docs.push({
        title: heading ? heading[1].trim() : slug,
        slug,
        url: current.url,
        markdown,
      });
    }
    current = null;
  };

  for (const line of text.split(/\r?\n/)) {
    const marker = line.match(/^Source:\s*(\S+)/);
    if (marker) {
      flush();
      current = { url: marker[1], lines: [] };
      continue;
    }
    if (!current) continue;
    // Drop MDX build noise: `import X from '@mdx/…'` and lone component tags
    // such as `<Callout type="error">`. Their text content is kept.
    if (/^import\s+[A-Za-z]/.test(line)) continue;
    if (/^<\/?[A-Z][A-Za-z0-9.]*[^>]*>$/.test(line.trim())) continue;
    current.lines.push(line);
  }
  flush();

  return docs;
}

/**
 * Fetch the whole documentation set as Markdown (one request, cached).
 * Only used by `search_docs` with `depth: "full"` — it is a few MB.
 */
export async function fetchFullCorpus(
  options: { fresh?: boolean } = {},
): Promise<FullDoc[]> {
  if (!options.fresh && fullCache && isFresh(fullFetchedAt)) return fullCache;

  const response = await fetch(llmsFullTxtUrl, {
    headers: { accept: "text/plain" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch llms-full.txt (${response.status})`);
  }

  const docs = parseLlmsFullTxt(await response.text());
  if (docs.length === 0) throw new Error("llms-full.txt contained no pages");

  fullCache = docs;
  fullFetchedAt = Date.now();
  return docs;
}

// ============================================================================
// Markdown helpers
// ============================================================================

/**
 * Keep only the sections whose heading contains one of `sectionNames`.
 * Falls back to the full document when nothing matches.
 */
export function extractSections(
  markdown: string,
  sectionNames: string[],
): string {
  if (!sectionNames || sectionNames.length === 0) return markdown;

  const lines = markdown.split("\n");
  const sections: string[] = [];
  let current: string[] | null = null;
  let inTargetSection = false;

  for (const line of lines) {
    const header = line.match(/^#+\s+(.+)$/);
    if (header) {
      const headerText = header[1].trim().toLowerCase();
      inTargetSection = sectionNames.some((name) =>
        headerText.includes(name.toLowerCase()),
      );
      if (!inTargetSection && current) {
        sections.push(current.join("\n"));
        current = null;
      }
    }
    if (inTargetSection) {
      if (!current) current = [];
      current.push(line);
    }
  }
  if (current) sections.push(current.join("\n"));

  return sections.length > 0 ? sections.join("\n\n") : markdown;
}

/** Strip Markdown syntax, for `format: "plaintext"`. */
export function toPlaintext(markdown: string): string {
  return markdown.replace(/[#*`\[\]()]/g, "").replace(/\n{3,}/g, "\n\n");
}
