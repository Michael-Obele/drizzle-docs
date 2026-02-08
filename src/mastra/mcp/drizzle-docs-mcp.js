import { MCPServer } from "@mastra/mcp";
import { createTool } from "@mastra/core/tools";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { z } from "zod";
// Cache for storing crawled content
const contentCache = new Map();
// Base URL for Drizzle docs
const BASE_URL = "https://orm.drizzle.team";
// Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
});
// Tool: List all available documentation topics
const listTopicsTool = createTool({
    id: "list_topics",
    description: "Browse all available documentation topics from the Drizzle ORM docs sidebar, including connect options, guides, migrations, and more",
    inputSchema: z.object({}),
    execute: async () => {
        try {
            // Crawl the main docs page to discover all topics
            const response = await fetch(`${BASE_URL}/docs/overview`);
            if (!response.ok) {
                throw new Error(`Failed to fetch docs overview: ${response.status}`);
            }
            const html = await response.text();
            const $ = cheerio.load(html);
            // Extract navigation items using data-nav-index attribute (comprehensive, non-hardcoded)
            // The Drizzle site explicitly indexes all navigation items, making this the most reliable selector
            const topics = [];
            // Primary selector: Use data-nav-index for all explicitly indexed navigation links
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
                        index: navIndex,
                    });
                }
            });
            // Sort by the navigation index to preserve order
            topics.sort((a, b) => a.index - b.index);
            // Remove duplicates while preserving order
            const uniqueTopics = Array.from(new Map(topics.map((topic) => [topic.url, topic])).values()).map(({ title, url }) => ({ title, url }));
            if (uniqueTopics.length === 0) {
                throw new Error("No documentation topics found on the page");
            }
            return {
                topics: uniqueTopics,
                total: uniqueTopics.length,
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
// Tool: Fetch a specific documentation page
const fetchPageTool = createTool({
    id: "fetch_page",
    description: "Fetch the converted Markdown content of a specific documentation page from Drizzle ORM docs",
    inputSchema: z.object({
        slug: z
            .string()
            .describe('The page slug (e.g., "sql-schema-declaration", "docs/overview")'),
    }),
    execute: async ({ slug }) => {
        try {
            // Check cache first
            const cacheKey = slug;
            const cached = contentCache.get(cacheKey);
            if (cached && Date.now() - cached.lastFetched < 3600000) {
                // 1 hour cache
                return {
                    title: cached.title,
                    content: cached.markdown,
                    cached: true,
                };
            }
            // Construct full URL
            const url = slug.startsWith("http") ? slug : `${BASE_URL}/${slug}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch page: ${response.status}`);
            }
            const html = await response.text();
            const $ = cheerio.load(html);
            // Extract title
            const title = $("title").text() || $("h1").first().text() || "Untitled";
            // Extract main content (adjust selectors based on actual site structure)
            // Remove navigation, sidebars, footers
            $("nav, .sidebar, footer, header, aside, [data-nav], [data-sidebar]").remove();
            // Get main content area
            const mainContent = $("main, article, .content, [data-content], .prose").first();
            const contentHtml = mainContent.length ? mainContent.html() : $.html();
            if (!contentHtml) {
                throw new Error("No content found on page");
            }
            // Convert to Markdown
            const markdown = turndownService.turndown(contentHtml);
            // Cache the result
            contentCache.set(cacheKey, {
                markdown,
                title,
                lastFetched: Date.now(),
            });
            return {
                title,
                content: markdown,
                cached: false,
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
// Tool: Search documentation
const searchDocsTool = createTool({
    id: "search_docs",
    description: "Search for specific topics or error messages across crawled Drizzle ORM documentation content",
    inputSchema: z.object({
        query: z
            .string()
            .describe('Search query (e.g., "relational queries", "schema declaration")'),
        limit: z
            .number()
            .optional()
            .default(10)
            .describe("Maximum number of results to return"),
    }),
    execute: async ({ query, limit = 10 }) => {
        try {
            // For now, implement simple keyword search across cached content
            // In a full implementation, this would use semantic search or RAG
            const results = [];
            for (const [slug, data] of contentCache.entries()) {
                const content = data.markdown.toLowerCase();
                const title = data.title.toLowerCase();
                const searchQuery = query.toLowerCase();
                // Simple scoring based on matches
                let score = 0;
                if (title.includes(searchQuery))
                    score += 10;
                if (content.includes(searchQuery))
                    score += 5;
                // Count occurrences
                const titleMatches = (title.match(new RegExp(searchQuery, "g")) || [])
                    .length;
                const contentMatches = (content.match(new RegExp(searchQuery, "g")) || []).length;
                score += titleMatches * 2 + contentMatches;
                if (score > 0) {
                    // Extract excerpt around first match
                    const index = content.indexOf(searchQuery);
                    const start = Math.max(0, index - 100);
                    const end = Math.min(content.length, index + 200);
                    const excerpt = data.markdown
                        .substring(start, end)
                        .replace(/\n/g, " ")
                        .trim();
                    results.push({
                        slug,
                        title: data.title,
                        excerpt: excerpt + (end < content.length ? "..." : ""),
                        score,
                    });
                }
            }
            // Sort by score and limit results
            results.sort((a, b) => b.score - a.score);
            const topResults = results.slice(0, limit);
            return {
                query,
                results: topResults,
                total: topResults.length,
            };
        }
        catch (error) {
            console.error("Error searching docs:", error);
            return {
                error: "Failed to search documentation",
                details: error instanceof Error ? error.message : "Unknown error",
            };
        }
    },
});
// Create the MCP Server using Mastra's MCPServer
export const drizzleDocsMcpServer = new MCPServer({
    id: "drizzle-docs-mcp",
    name: "Drizzle ORM Docs MCP",
    version: "1.0.0",
    description: "A Model Context Protocol server that provides real-time access to Drizzle ORM documentation",
    instructions: "Use these tools to access Drizzle ORM documentation. Start by listing topics to see available documentation, then fetch specific pages or search for content.",
    tools: {
        listTopics: listTopicsTool,
        fetchPage: fetchPageTool,
        searchDocs: searchDocsTool,
    },
});
