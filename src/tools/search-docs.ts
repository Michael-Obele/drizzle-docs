import { z } from "zod";
import type { McpServer } from "tmcp";
import { fetchFullCorpus, fetchIndex } from "../lib/docs.js";
import { filterEntries, searchContent, searchEntries } from "../lib/search.js";
import { fail, json, message } from "./result.js";

const schema = z.object({
  query: z
    .string()
    .min(1)
    .describe('What to search for, e.g. "relational queries" or "batch api".'),
  depth: z
    .enum(["index", "full"])
    .optional()
    .describe(
      '"index" (default) = fast title/section search. "full" = content search with snippets.',
    ),
  dialect: z
    .string()
    .optional()
    .describe('Restrict results to one SQL dialect, e.g. "pg".'),
  section: z
    .string()
    .optional()
    .describe('Restrict results to one section, e.g. "Migrations".'),
  limit: z
    .number()
    .int()
    .optional()
    .describe("Maximum results (default 10, max 50)."),
});

const clamp = (value: number | undefined, fallback: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), max);
};

/**
 * `search_docs` — find the right page (fast) or the answer (thorough).
 *
 * `depth: "index"` searches titles/slugs/sections straight from llms.txt.
 * `depth: "full"` downloads llms-full.txt once and searches page content,
 * returning a snippet from each match.
 */
// `any`: tmcp's McpServer is generic over its adapter's schema type; the tool
// schema itself stays checked by `server.tool<typeof schema>(...)`.
export function registerSearchDocs(server: McpServer<any>): void {
  server.tool<typeof schema>(
    {
      name: "search_docs",
      title: "Search Drizzle docs",
      description:
        'Search the Drizzle ORM documentation. depth "index" (default) fuzzy-searches titles, slugs and sections from /llms.txt — instant, use it to pick the right page. depth "full" downloads /llms-full.txt once (a few MB) and searches the actual page text, returning a `snippet` around every match — use it when you need the answer, not just a link. Filter with `dialect` (pg, mysql, sqlite, mssql, cockroach, singlestore) and/or `section`. Tolerates typos: "migraton" still finds Migrations.',
      schema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const limit = clamp(input.limit, 10, 50);
        const index = await fetchIndex();
        const entries = filterEntries(
          index.entries,
          input.dialect,
          input.section,
        );

        if (entries.length === 0) {
          return json({
            query: input.query,
            depth: input.depth ?? "index",
            results: [],
            note: "No pages match that dialect/section. Call list_topics with no arguments to see what exists.",
          });
        }

        if (input.depth === "full") {
          const corpus = await fetchFullCorpus();
          const allowed = new Set(entries.map((entry) => entry.slug));
          const dialect = input.dialect?.toLowerCase();
          const scoped = corpus.filter(
            (doc) =>
              allowed.has(doc.slug) ||
              (Boolean(dialect) &&
                dialect !== "all" &&
                doc.slug.includes(`/${dialect}/`)),
          );

          // The corpus can hold pages llms.txt does not list; never return an
          // empty set just because of a filter mismatch.
          const hits = searchContent(
            scoped.length > 0 ? scoped : corpus,
            input.query,
            limit,
          );

          return json({
            query: input.query,
            depth: "full",
            total: hits.length,
            results: hits.map((hit) => ({
              title: hit.doc.title,
              slug: hit.doc.slug,
              url: hit.doc.url,
              score: hit.score,
              snippet: hit.snippet,
            })),
            note:
              hits.length === 0
                ? "No content matches. Try fewer words, or fetch_page on a likely slug."
                : "Pass a `slug` to fetch_page to read the whole page.",
          });
        }

        const hits = searchEntries(entries, input.query, limit);
        return json({
          query: input.query,
          depth: "index",
          total: hits.length,
          results: hits.map((hit) => ({
            title: hit.entry.title,
            slug: hit.entry.slug,
            url: hit.entry.url,
            dialect: hit.entry.dialect,
            section: hit.entry.section,
            score: hit.score,
          })),
          note:
            hits.length === 0
              ? 'No matches. Try fewer words, drop the filters, or use depth "full" to search page content.'
              : "Pass a `slug` to fetch_page to read the page.",
        });
      } catch (error) {
        return fail(`Failed to search documentation: ${message(error)}`);
      }
    },
  );
}
