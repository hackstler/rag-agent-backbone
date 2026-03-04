import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { YouTubeApiService } from "../services/youtube-api.service.js";

export interface GetVideoDetailsDeps {
  youtubeService: YouTubeApiService;
}

export function createGetVideoDetailsTool({ youtubeService }: GetVideoDetailsDeps) {
  return createTool({
    id: "getYouTubeVideoDetails",
    description: "Get detailed information about a specific YouTube video including duration, view count, likes, tags, and more.",
    inputSchema: z.object({
      videoId: z.string().describe("The YouTube video ID (e.g. 'dQw4w9WgXcQ')"),
    }),
    outputSchema: z.object({
      videoId: z.string(),
      title: z.string(),
      description: z.string(),
      channelTitle: z.string(),
      publishedAt: z.string(),
      duration: z.string(),
      viewCount: z.string(),
      likeCount: z.string(),
      commentCount: z.string(),
      tags: z.array(z.string()),
      thumbnailUrl: z.string(),
      url: z.string(),
    }),
    execute: async ({ videoId }) => {
      return youtubeService.getVideoDetails(videoId);
    },
  });
}
