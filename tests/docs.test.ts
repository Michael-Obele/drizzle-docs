import { describe, expect, test } from "bun:test";
import {
  dialectFallbackUrl,
  extractSections,
  parseLlmsFullTxt,
  parseLlmsTxt,
  toSlug,
} from "../src/lib/docs.js";
import { filterEntries, searchEntries } from "../src/lib/search.js";

const LLMS_TXT = `# Drizzle

> Drizzle is a modern TypeScript ORM.

## meet drizzle

- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Drizzle gotchas](https://orm.drizzle.team/docs/gotchas)

## pg/Migrations

- [Drizzle Kit generate](https://orm.drizzle.team/docs/pg/generate)
- [Migrate with Drizzle Kit](https://orm.drizzle.team/docs/pg/migrate)

## sqlite/Access your data

- [SQL Select](https://orm.drizzle.team/docs/sqlite/select)
`;

describe("parseLlmsTxt", () => {
  const index = parseLlmsTxt(LLMS_TXT);

  test("reads every entry", () => {
    expect(index.entries).toHaveLength(5);
    expect(index.entries[0].title).toBe("Drizzle ORM");
    expect(index.entries[0].slug).toBe("docs/overview");
  });

  test("splits dialect-prefixed sections", () => {
    const generate = index.entries.find((e) => e.slug === "docs/pg/generate");
    expect(generate?.dialect).toBe("pg");
    expect(generate?.section).toBe("Migrations");
  });

  test("keeps shared pages under the general dialect", () => {
    const overview = index.entries.find((e) => e.slug === "docs/overview");
    expect(overview?.dialect).toBe("general");
    expect(overview?.section).toBe("meet drizzle");
  });

  test("derives dialects and section counts from the file", () => {
    expect(index.dialects).toEqual(["general", "pg", "sqlite"]);
    expect(index.sections).toEqual([
      { dialect: "general", section: "meet drizzle", count: 2 },
      { dialect: "pg", section: "Migrations", count: 2 },
      { dialect: "sqlite", section: "Access your data", count: 1 },
    ]);
  });
});

describe("parseLlmsFullTxt", () => {
  const corpus = parseLlmsFullTxt(`# Drizzle

> intro paragraph

Source: https://orm.drizzle.team/docs/select

import Npm from '@mdx/Npm.astro';

# SQL Select

<Callout type="error">
select body with \`db.select()\`
</Callout>

Source: https://orm.drizzle.team/docs/insert

# SQL Insert

insert body
`);

  test("splits pages on the Source marker", () => {
    expect(corpus).toHaveLength(2);
    expect(corpus[0].slug).toBe("docs/select");
    expect(corpus[0].title).toBe("SQL Select");
    expect(corpus[0].markdown).toContain("db.select()");
    expect(corpus[1].slug).toBe("docs/insert");
  });

  test("drops MDX import lines and lone component tags", () => {
    expect(corpus[0].markdown).not.toContain("import Npm");
    expect(corpus[0].markdown).not.toContain("<Callout");
    // Their text content stays searchable.
    expect(corpus[0].markdown).toContain("select body");
  });
});

describe("dialect fallback (llms.txt links that 404)", () => {
  const dialects = ["general", "pg", "sqlite"];

  test("rewrites a shared page to its unprefixed URL", () => {
    expect(
      dialectFallbackUrl("https://orm.drizzle.team/docs/pg/overview", dialects),
    ).toBe("https://orm.drizzle.team/docs/overview");
  });

  test("never rewrites a path that is not dialect prefixed", () => {
    expect(
      dialectFallbackUrl(
        "https://orm.drizzle.team/docs/get-started/postgresql-new",
        dialects,
      ),
    ).toBeNull();
    expect(
      dialectFallbackUrl("https://orm.drizzle.team/docs/pg/select", []),
    ).toBeNull();
  });
});

describe("search", () => {
  const index = parseLlmsTxt(LLMS_TXT);

  test("filterEntries narrows by dialect and section", () => {
    expect(filterEntries(index.entries, "pg")).toHaveLength(2);
    expect(filterEntries(index.entries, undefined, "migrations")).toHaveLength(
      2,
    );
    expect(filterEntries(index.entries, "sqlite", "migrations")).toHaveLength(
      0,
    );
  });

  test("searchEntries tolerates typos", () => {
    const hits = searchEntries(index.entries, "migraton", 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].entry.section).toBe("Migrations");
  });
});

describe("markdown helpers", () => {
  test("extractSections keeps only matching headings", () => {
    const markdown = [
      "# Page",
      "",
      "intro",
      "",
      "## Examples",
      "",
      "example body",
      "",
      "## API",
      "",
      "api body",
    ].join("\n");

    const only = extractSections(markdown, ["Examples"]);
    expect(only).toContain("example body");
    expect(only).not.toContain("api body");
    // Falls back to the whole page when nothing matches.
    expect(extractSections(markdown, ["Nope"])).toBe(markdown);
  });

  test("toSlug strips the docs host", () => {
    expect(toSlug("https://orm.drizzle.team/docs/pg/select")).toBe(
      "docs/pg/select",
    );
  });
});
