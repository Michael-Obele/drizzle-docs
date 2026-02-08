import { MCPServer } from "@mastra/mcp";
import { createTool } from "@mastra/core/tools";
import Fuse from "fuse.js";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { z } from "zod";
// ============================================================================
// Global Caches
// ============================================================================
const contentCache = new Map();
const docMetadataCache = new Map();
let fuseIndex = null;
const BASE_URL = "https://orm.drizzle.team";
// Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
});
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Fetch all documentation topics from the Drizzle docs sidebar
 */
async function fetchAllTopics() {
    try {
        const response = await fetch(`${BASE_URL}/docs/overview`);
        if (!response.ok) {
            throw new Error(`Failed to fetch docs overview: ${response.status}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        const topics = [];
        $("a[data-nav-index]").each((_, element) => {
            const $link = $(element);
            const href = $link.attr("href");
            const title = $link.text().trim();
            const navIndex = parseInt($link.attr("data-nav-index") || "-1");
            if (href &&
                title &&
                (href.startsWith("/docs/") || href.startsWith("#"))) {
                topics.push({
                    title,
                    url: href,
                });
            }
        });
        // Sort by navigation index to preserve order
        topics.sort((a, b) => {
            const aIndex = parseInt(cheerio.load(html)(`a[href="${a.url}"]`).attr("data-nav-index") || "-1");
            const bIndex = parseInt(cheerio.load(html)(`a[href="${b.url}"]`).attr("data-nav-index") || "-1");
            return aIndex - bIndex;
        });
        // Remove duplicates while preserving order
        const uniqueTopics = Array.from(new Map(topics.map((topic) => [topic.url, topic])).values());
        return uniqueTopics;
    }
    catch (error) {
        console.error("Error fetching topics:", error);
        return [];
    }
}
/**
 * Fetch a single documentation page
 */
async function fetchDocumentation(slug) {
    try {
        const cacheKey = slug;
        const cached = contentCache.get(cacheKey);
        // Return cached if valid (1 hour)
        if (cached && Date.now() - cached.lastFetched < 3600000) {
            return cached;
        }
        const url = slug.startsWith("http") ? slug : `${BASE_URL}/${slug}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch page: ${response.status}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        // Extract title
        const title = $("title").text() || $("h1").first().text() || "Untitled";
        // Extract and clean content
        $("nav, .sidebar, footer, header, aside, [data-nav], [data-sidebar]").remove();
        const mainContent = $("main, article, .content, [data-content], .prose").first();
        const contentHtml = mainContent.length ? mainContent.html() : $.html();
        if (!contentHtml) {
            throw new Error("No content found on page");
        }
        const markdown = turndownService.turndown(contentHtml);
        const result = {
            markdown,
            title,
            lastFetched: Date.now(),
        };
        contentCache.set(cacheKey, result);
        return result;
    }
    catch (error) {
        console.error("Error fetching documentation:", error);
        return null;
    }
}
/**
 * Extract specific sections from markdown content
 */
function extractSections(markdown, sectionNames) {
    if (!sectionNames || sectionNames.length === 0) {
        return markdown;
    }
    const lines = markdown.split("\n");
    const sections = [];
    let currentSection = null;
    let inTargetSection = false;
    for (const line of lines) {
        const headerMatch = line.match(/^#+\s+(.+)$/);
        if (headerMatch) {
            const headerText = headerMatch[1].trim().toLowerCase();
            inTargetSection = sectionNames.some((name) => headerText.includes(name.toLowerCase()));
            if (!inTargetSection && currentSection) {
                sections.push(currentSection.join("\n"));
                currentSection = null;
            }
        }
        if (inTargetSection) {
            if (!currentSection) {
                currentSection = [];
            }
            currentSection.push(line);
        }
    }
    if (currentSection) {
        sections.push(currentSection.join("\n"));
    }
    return sections.length > 0 ? sections.join("\n\n") : markdown;
}
/**
 * Initialize documentation cache at server startup
 */
async function initializeDocumentationCache() {
    try {
        console.log("🔄 Initializing documentation cache...");
        const topics = await fetchAllTopics();
        console.log(`📚 Found ${topics.length} topics, pre-caching documentation...`);
        // Pre-fetch in batches to avoid overwhelming the server
        const BATCH_SIZE = 5;
        for (let i = 0; i < topics.length; i += BATCH_SIZE) {
            const batch = topics.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (topic) => {
                try {
                    const slug = topic.url.replace(/^\//, "");
                    const cached = await fetchDocumentation(slug);
                    if (cached && cached.title && cached.markdown) {
                        // Extract excerpt
                        const excerpt = cached.markdown
                            .substring(0, 300)
                            .replace(/[#*`]/g, "")
                            .replace(/\n/g, " ")
                            .trim()
                            .substring(0, 200) + "...";
                        docMetadataCache.set(slug, {
                            title: cached.title,
                            slug,
                            excerpt,
                            url: topic.url,
                        });
                    }
                }
                catch (e) {
                    console.warn(`⚠️ Failed to cache ${topic.url}:`, e instanceof Error ? e.message : "Unknown error");
                }
            }));
        }
        // Initialize Fuse index
        const docsArray = Array.from(docMetadataCache.values());
        fuseIndex = new Fuse(docsArray, {
            keys: ["title", "slug", "excerpt"],
            threshold: 0.4, // Fuzzy matching with typo tolerance
            ignoreLocation: true,
            minMatchCharLength: 2,
        });
        console.log(`✅ Cache initialized with ${docMetadataCache.size} documents`);
    }
    catch (error) {
        console.error("❌ Error initializing documentation cache:", error instanceof Error ? error.message : "Unknown error");
    }
}
// ============================================================================
// MCP Tools
// ============================================================================
/**
 * Tool: List all available documentation topics
 */
const listTopicsTool = createTool({
    id: "list_topics",
    description: "Discover all 97 available Drizzle ORM documentation pages. Use this to: (1) understand the documentation structure, (2) find specific topics of interest, (3) get the slug for use with fetch_page. Perfect starting point for exploring Drizzle ORM features and capabilities.",
    inputSchema: z.object({}),
    mcp: {
        annotations: {
            title: "List Documentation Topics",
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    },
    execute: async () => {
        try {
            const topics = await fetchAllTopics();
            if (topics.length === 0) {
                throw new Error("No documentation topics found");
            }
            return {
                topics: topics.map((t) => ({
                    title: t.title,
                    slug: t.url.replace(/^\//, ""),
                    url: t.url,
                })),
                total: topics.length,
            };
        }
        catch (error) {
            console.error("Error listing topics:", error);
            return {
                error: "Failed to list documentation topics",
                details: error instanceof Error ? error.message : "Unknown error",
            };
        }
    },
});
/**
 * Tool: Fetch a specific documentation page
 */
const fetchPageTool = createTool({
    id: "fetch_page",
    description: "Fetch and convert documentation pages from Drizzle ORM docs to Markdown. Supports optional filtering by format and sections. Use this after discovering page slugs from list_topics or search_docs for detailed exploration.",
    inputSchema: z.object({
        slug: z
            .string()
            .describe('The page slug (e.g., "docs/select", "docs/insert")'),
        format: z
            .enum(["markdown", "json", "plaintext"])
            .optional()
            .default("markdown")
            .describe("Output format: markdown (default), json, or plaintext"),
        sections: z
            .array(z.string())
            .optional()
            .describe("Optional: Extract only specific sections by header name (e.g., ['Examples', 'Basic Usage'])"),
        maxLength: z
            .number()
            .optional()
            .describe("Optional: Truncate response to specified character length"),
    }),
    mcp: {
        annotations: {
            title: "Fetch Documentation Page",
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    },
    execute: async ({ slug, format = "markdown", sections, maxLength, }) => {
        try {
            const doc = await fetchDocumentation(slug);
            if (!doc || !doc.title || !doc.markdown) {
                throw new Error("No content found");
            }
            let content = doc.markdown;
            // Extract specific sections if requested
            if (sections && sections.length > 0) {
                content = extractSections(content, sections);
            }
            // Apply max length if specified
            if (maxLength && content.length > maxLength) {
                content = content.substring(0, maxLength) + "\n\n... (truncated)";
            }
            // Format conversion
            let formattedContent = content;
            if (format === "json") {
                formattedContent = JSON.stringify({
                    title: doc.title,
                    slug,
                    content: content,
                });
            }
            else if (format === "plaintext") {
                // Remove markdown formatting
                formattedContent = content
                    .replace(/[#*`\[\]()]/g, "")
                    .replace(/\n{3,}/g, "\n\n");
            }
            return {
                title: doc.title,
                slug,
                format,
                content: formattedContent,
                cached: Date.now() - (contentCache.get(slug)?.lastFetched || 0) < 3600000,
            };
        }
        catch (error) {
            console.error("Error fetching page:", error);
            return {
                error: "Failed to fetch documentation page",
                details: error instanceof Error ? error.message : "Unknown error",
            };
        }
    },
});
/**
 * Tool: Search documentation with fuzzy matching
 */
const searchDocsTool = createTool({
    id: "search_docs",
    description: "Search Drizzle ORM documentation using fuzzy matching. Tolerates typos, misspellings, partial matches, and uses intelligent ranking to find relevant pages. Use this to discover documentation related to specific features. Examples: 'migration' finds migration guides, 'join' finds join documentation.",
    inputSchema: z.object({
        query: z
            .string()
            .min(1)
            .describe("Search query (e.g., 'relational queries', 'migrations')"),
        limit: z
            .number()
            .optional()
            .default(10)
            .describe("Maximum number of results to return (default: 10, max: 50)"),
    }),
    mcp: {
        annotations: {
            title: "Search Documentation",
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    },
    execute: async ({ query, limit = 10, }) => {
        try {
            // Build or use cached Fuse index
            if (!fuseIndex) {
                // Fall back to current cache
                const docs = Array.from(docMetadataCache.values());
                if (docs.length === 0) {
                    return {
                        query,
                        results: [],
                        message: "No documentation cached. Try fetch_page with a specific slug.",
                    };
                }
                fuseIndex = new Fuse(docs, {
                    keys: ["title", "slug", "excerpt", "content"],
                    threshold: 0.4,
                    ignoreLocation: true,
                    minMatchCharLength: 2,
                    shouldSort: true,
                });
            }
            const searchResults = fuseIndex.search(query, {
                limit: Math.min(limit, 50),
            });
            const results = searchResults.map((result) => ({
                slug: result.item.slug,
                title: result.item.title,
                excerpt: result.item.excerpt || "No excerpt available",
                score: Math.round((1 - (result.score ?? 0)) * 100),
                url: result.item.url,
            }));
            return {
                query,
                results,
                total: results.length,
                note: results.length === 0
                    ? "No results found. Try a different query or use list_topics to browse all documentation."
                    : undefined,
            };
        }
        catch (error) {
            console.error("Error searching docs:", error);
            return {
                error: "Failed to search documentation",
                details: error instanceof Error ? error.message : "Unknown error",
                query,
            };
        }
    },
});
// Create the MCP Server using Mastra's MCPServer
export const drizzleDocsMcpServer = new MCPServer({
    id: "drizzle-docs-mcp",
    name: "Drizzle ORM Docs MCP",
    version: "2.0.0",
    description: "A production-grade Model Context Protocol server providing comprehensive access to all 97 Drizzle ORM documentation pages with fuzzy search, pre-caching, and flexible content retrieval.",
    instructions: "Access complete Drizzle ORM documentation with three tools: (1) list_topics to browse all 97 available pages, (2) search_docs for fuzzy-searched results tolerating typos and partial matches, (3) fetch_page to retrieve full documentation with optional format conversion and section filtering. Results are pre-cached for performance. Start with list_topics or search_docs to discover pages, then fetch_page for detailed content.",
    tools: {
        listTopics: listTopicsTool,
        fetchPage: fetchPageTool,
        searchDocs: searchDocsTool,
    },
});
// Initialize documentation cache on server startup
initializeDocumentationCache().catch((error) => {
    console.error("Failed to initialize documentation cache:", error);
});
