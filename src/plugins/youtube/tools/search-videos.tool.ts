import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { YouTubeApiService } from "../services/youtube-api.service.js";

export interface SearchVideosDeps {
  youtubeService: YouTubeApiService;
}

export function createSearchVideosTool({ youtubeService }: SearchVideosDeps) {
  return createTool({
    id: "searchYouTubeVideos",
    description: "Search YouTube for videos matching a query. Returns a list of videos with title, channel, URL, and thumbnail.",
    inputSchema: z.object({
      query: z.string().describe("Search query for YouTube videos"),
      maxResults: z.number().min(1).max(25).optional().describe("Maximum number of results to return (default: 5)"),
    }),
    outputSchema: z.object({
      videos: z.array(z.object({
        videoId: z.string(),
        title: z.string(),
        description: z.string(),
        channelTitle: z.string(),
        publishedAt: z.string(),
        thumbnailUrl: z.string(),
        url: z.string(),
      })),
      totalResults: z.number(),
    }),
    execute: async ({ query, maxResults }) => {
      const videos = await youtubeService.searchVideos(query, maxResults ?? 5);
      return { videos, totalResults: videos.length };
    },
  });
}
