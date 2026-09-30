import Fuse from "fuse.js";
import type { DocEntry, FullDoc } from "./docs.js";

/** A search hit from the index (title/slug/section level). */
export interface EntryHit {
  entry: DocEntry;
  /** 0-100, higher is better. */
  score: number;
}

/** A search hit from the full-text corpus, with a content snippet. */
export interface ContentHit {
  doc: FullDoc;
  snippet: string;
  /** 0-100, higher is better. */
  score: number;
}

/**
 * Narrow the catalogue before searching.
 *
 * `dialect` is an exact match (`pg`, `mysql`, ... or `general`); `section` is a
 * case-insensitive substring match so `migrations` finds `Migrations`.
 */
export function filterEntries(
  entries: DocEntry[],
  dialect?: string,
  section?: string,
): DocEntry[] {
  const wantedDialect = dialect?.trim().toLowerCase();
  const wantedSection = section?.trim().toLowerCase();

  return entries.filter((entry) => {
    if (
      wantedDialect &&
      wantedDialect !== "all" &&
      entry.dialect.toLowerCase() !== wantedDialect
    ) {
      return false;
    }
    if (
      wantedSection &&
      wantedSection !== "all" &&
      !entry.section.toLowerCase().includes(wantedSection)
    ) {
      return false;
    }
    return true;
  });
}

/** Typo-tolerant search over titles, slugs and sections. */
export function searchEntries(
  entries: DocEntry[],
  query: string,
  limit: number,
): EntryHit[] {
  const fuse = new Fuse(entries, {
    keys: [
      { name: "title", weight: 0.55 },
      { name: "slug", weight: 0.3 },
      { name: "section", weight: 0.15 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  });

  return fuse.search(query, { limit }).map((result) => ({
    entry: result.item,
    score: Math.round((1 - (result.score ?? 1)) * 100),
  }));
}

// The full corpus is a few megabytes, so its index is built once and reused
// for as long as the caller keeps passing the same corpus array.
let fullIndex: { docs: FullDoc[]; fuse: Fuse<FullDoc> } | null = null;

function fullFuse(docs: FullDoc[]): Fuse<FullDoc> {
  if (!fullIndex || fullIndex.docs !== docs) {
    fullIndex = {
      docs,
      fuse: new Fuse(docs, {
        keys: [
          { name: "title", weight: 0.35 },
          { name: "markdown", weight: 0.65 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 3,
        includeScore: true,
        includeMatches: true,
      }),
    };
  }
  return fullIndex.fuse;
}

/** Pull a readable window out of the page around the first match. */
export function snippetAround(
  markdown: string,
  indices?: ReadonlyArray<readonly [number, number]>,
): string {
  const first = indices?.[0];
  if (!first) {
    const head = markdown.slice(0, 240).replace(/\s+/g, " ").trim();
    return `${head}${markdown.length > 240 ? "…" : ""}`;
  }

  const [start, end] = first;
  const from = Math.max(0, start - 140);
  const to = Math.min(markdown.length, end + 240);
  const body = markdown.slice(from, to).replace(/\s+/g, " ").trim();
  return `${from > 0 ? "…" : ""}${body}${to < markdown.length ? "…" : ""}`;
}

/** Typo-tolerant search across the real page content. */
export function searchContent(
  docs: FullDoc[],
  query: string,
  limit: number,
): ContentHit[] {
  return fullFuse(docs)
    .search(query, { limit })
    .map((result) => {
      const textMatch = result.matches?.find(
        (match) => match.key === "markdown",
      );
      return {
        doc: result.item,
        snippet: snippetAround(result.item.markdown, textMatch?.indices),
        score: Math.round((1 - (result.score ?? 1)) * 100),
      };
    });
}
