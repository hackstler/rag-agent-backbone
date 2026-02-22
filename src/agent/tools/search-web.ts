import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Web search fallback via Tavily.
 * No RAG deps needed — use as-is when knowledge base has no results.
 */
export function createSearchWebTool() {
  return createTool({
    id: "search-web",
    description: `Search the web for information NOT found in the knowledge base.
ONLY use this as a fallback when searchDocuments returns 0 results AND the user needs current information.
Always tell the user when the answer comes from a web search, not from their documents.`,
    inputSchema: z.object({
      query: z.string().describe("The search query"),
    }),
    outputSchema: z.object({
      results: z.array(
        z.object({
          title: z.string(),
          snippet: z.string(),
          url: z.string(),
        })
      ),
      source: z.literal("web"),
      available: z.boolean(),
    }),
    execute: async ({ query }) => {
      const tavilyKey = process.env["TAVILY_API_KEY"];

      if (!tavilyKey) {
        return { results: [], source: "web" as const, available: false };
      }

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          max_results: 3,
          search_depth: "basic",
        }),
      });

      if (!response.ok) {
        return { results: [], source: "web" as const, available: true };
      }

      const data = (await response.json()) as {
        results: Array<{ title: string; content: string; url: string }>;
      };

      return {
        results: data.results.map((r) => ({
          title: r.title,
          snippet: r.content.slice(0, 400),
          url: r.url,
        })),
        source: "web" as const,
        available: true,
      };
    },
  });
}
