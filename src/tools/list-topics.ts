import { z } from "zod";
import type { McpServer } from "tmcp";
import { fetchIndex } from "../lib/docs.js";
import { filterEntries } from "../lib/search.js";
import { fail, json, message } from "./result.js";

const schema = z.object({
  dialect: z
    .string()
    .optional()
    .describe(
      'SQL dialect to list, e.g. "pg", "mysql", "sqlite". Omit for every dialect.',
    ),
  section: z
    .string()
    .optional()
    .describe(
      'Docs section to list, e.g. "Migrations" or "Access your data". Matched case-insensitively.',
    ),
  limit: z
    .number()
    .int()
    .optional()
    .describe("Maximum topics to return (default 60, max 500)."),
  offset: z
    .number()
    .int()
    .optional()
    .describe("Skip this many topics, for paging (default 0)."),
});

const clamp = (value: number | undefined, fallback: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), max);
};

/**
 * `list_topics` — browse the docs catalogue.
 *
 * With no arguments it answers "what exists?" (dialects, sections, counts).
 * With a `dialect`/`section` it answers "which pages are in that slice?".
 */
// `any`: tmcp's McpServer is generic over its adapter's schema type; the tool
// schema itself stays checked by `server.tool<typeof schema>(...)`.
export function registerListTopics(server: McpServer<any>): void {
  server.tool<typeof schema>(
    {
      name: "list_topics",
      title: "List Drizzle docs topics",
      description:
        'Browse the Drizzle ORM documentation catalogue (source: /llms.txt — about 450 pages). Call it with NO arguments first to get the map: every SQL dialect, every section, and how many pages each one holds. Then add `dialect` (pg, mysql, sqlite, mssql, cockroach, singlestore) and/or `section` (for example "Migrations", "Access your data", "Validations") to list the pages inside that slice — page the result with `limit`/`offset`. Each topic has a `slug` (like "docs/pg/select") to pass to fetch_page.',
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
        const index = await fetchIndex();
        const { dialect, section } = input;
        const limit = clamp(input.limit, 60, 500);
        const offset = Math.max(Math.trunc(input.offset ?? 0) || 0, 0);

        // No filter: return the catalogue, not 450 rows.
        if (!dialect && !section) {
          return json({
            source: index.source,
            total: index.entries.length,
            dialects: index.dialects,
            sections: index.sections,
            hint: "Re-call with `dialect` and/or `section` to list the pages of a slice, then pass a `slug` to fetch_page.",
          });
        }

        const matches = filterEntries(index.entries, dialect, section);
        const topics = matches.slice(offset, offset + limit);

        return json({
          dialect: dialect ?? "all",
          section: section ?? "all",
          total: matches.length,
          offset,
          limit,
          topics: topics.map((topic) => ({
            title: topic.title,
            slug: topic.slug,
            url: topic.url,
            dialect: topic.dialect,
            section: topic.section,
          })),
          note:
            matches.length === 0
              ? "Nothing in that slice. Call list_topics with no arguments to see the dialects and sections that exist."
              : offset + limit < matches.length
                ? `More available: call again with offset ${offset + limit}.`
                : undefined,
        });
      } catch (error) {
        return fail(`Failed to list documentation topics: ${message(error)}`);
      }
    },
  );
}
