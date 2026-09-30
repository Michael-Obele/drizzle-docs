import { z } from "zod";
import type { McpServer } from "tmcp";
import { extractSections, fetchPage, toPlaintext } from "../lib/docs.js";
import { fail, json, message, text } from "./result.js";

const schema = z.object({
  slug: z
    .string()
    .min(1)
    .describe('Page slug ("docs/pg/select") or a full URL.'),
  format: z
    .enum(["markdown", "json", "plaintext"])
    .optional()
    .describe("Output shape: markdown (default), json, or plaintext."),
  sections: z
    .array(z.string())
    .optional()
    .describe('Return only these sections, e.g. ["Examples", "Basic usage"].'),
  maxLength: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Truncate the content to this many characters."),
  fresh: z
    .boolean()
    .optional()
    .describe("Ignore the cache and re-download the page (default false)."),
});

/**
 * `fetch_page` — read one page as clean Markdown.
 *
 * Navigation, sidebars and footers are stripped, and the result is cached for
 * an hour so repeated reads are free.
 */
// `any`: tmcp's McpServer is generic over its adapter's schema type; the tool
// schema itself stays checked by `server.tool<typeof schema>(...)`.
export function registerFetchPage(server: McpServer<any>): void {
  server.tool<typeof schema>(
    {
      name: "fetch_page",
      title: "Fetch a Drizzle docs page",
      description:
        'Fetch one Drizzle ORM documentation page as clean Markdown (navigation, sidebars and footers are stripped). `slug` is a page slug such as "docs/pg/select", or a full https URL. Keep context small with `sections` (return only the headings whose names match, e.g. ["Examples"]) and `maxLength` (truncate). Use `format` for json/plaintext shapes, and `fresh: true` to bypass the one-hour cache. Discover slugs with list_topics or search_docs.',
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
        const page = await fetchPage(input.slug, {
          fresh: input.fresh === true,
        });

        let content = page.markdown;
        if (input.sections && input.sections.length > 0) {
          content = extractSections(content, input.sections);
        }
        if (input.maxLength && content.length > input.maxLength) {
          content = `${content.slice(0, input.maxLength)}\n\n… (truncated)`;
        }

        if (input.format === "json") {
          return json({
            title: page.title,
            slug: page.slug,
            url: page.url,
            content,
          });
        }

        if (input.format === "plaintext") {
          return text(toPlaintext(content));
        }

        const startsWithHeading = content.trimStart().startsWith("# ");
        return text(
          startsWithHeading ? content : `# ${page.title}\n\n${content}`,
        );
      } catch (error) {
        return fail(
          `Failed to fetch the documentation page: ${message(error)}`,
        );
      }
    },
  );
}
