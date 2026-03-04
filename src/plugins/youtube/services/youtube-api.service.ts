import { youtubeConfig } from "../config/youtube.config.js";

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  url: string;
}

export interface YouTubeVideoDetails {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  tags: string[];
  thumbnailUrl: string;
  url: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

export class YouTubeApiService {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchVideos(query: string, maxResults = 5): Promise<YouTubeSearchResult[]> {
    if (!this.apiKey) {
      throw new Error("YouTube API key is not configured. Set YOUTUBE_API_KEY or GOOGLE_API_KEY.");
    }

    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      q: query,
      maxResults: String(maxResults),
      regionCode: youtubeConfig.defaultRegion,
      key: this.apiKey,
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`YouTube Search API error (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as ApiResponse;
    const items = (data["items"] as ApiResponse[] | undefined) ?? [];

    return items.map((item) => {
      const videoId = String(item["id"]?.["videoId"] ?? "");
      const snippet = (item["snippet"] ?? {}) as ApiResponse;
      const thumbnails = (snippet["thumbnails"] ?? {}) as ApiResponse;

      return {
        videoId,
        title: String(snippet["title"] ?? ""),
        description: String(snippet["description"] ?? ""),
        channelTitle: String(snippet["channelTitle"] ?? ""),
        publishedAt: String(snippet["publishedAt"] ?? ""),
        thumbnailUrl: String(
          thumbnails["medium"]?.["url"] ?? thumbnails["default"]?.["url"] ?? "",
        ),
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });
  }

  async getVideoDetails(videoId: string): Promise<YouTubeVideoDetails> {
    if (!this.apiKey) {
      throw new Error("YouTube API key is not configured. Set YOUTUBE_API_KEY or GOOGLE_API_KEY.");
    }

    const params = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      id: videoId,
      key: this.apiKey,
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`YouTube Videos API error (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as ApiResponse;
    const items = (data["items"] as ApiResponse[] | undefined) ?? [];

    if (items.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const item = items[0]!;
    const snippet = (item["snippet"] ?? {}) as ApiResponse;
    const contentDetails = (item["contentDetails"] ?? {}) as ApiResponse;
    const statistics = (item["statistics"] ?? {}) as ApiResponse;
    const thumbnails = (snippet["thumbnails"] ?? {}) as ApiResponse;

    return {
      videoId: String(item["id"] ?? videoId),
      title: String(snippet["title"] ?? ""),
      description: String(snippet["description"] ?? ""),
      channelTitle: String(snippet["channelTitle"] ?? ""),
      publishedAt: String(snippet["publishedAt"] ?? ""),
      duration: String(contentDetails["duration"] ?? ""),
      viewCount: String(statistics["viewCount"] ?? "0"),
      likeCount: String(statistics["likeCount"] ?? "0"),
      commentCount: String(statistics["commentCount"] ?? "0"),
      tags: (snippet["tags"] as string[]) ?? [],
      thumbnailUrl: String(
        thumbnails["maxres"]?.["url"] ?? thumbnails["high"]?.["url"] ?? thumbnails["medium"]?.["url"] ?? "",
      ),
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }
}
