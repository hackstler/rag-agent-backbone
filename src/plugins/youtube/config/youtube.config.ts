export const youtubeConfig = {
  agentName: "YouTubeAgent",
  apiKey: process.env["YOUTUBE_API_KEY"] ?? process.env["GOOGLE_API_KEY"] ?? "",
  maxResults: 10,
  defaultRegion: "ES",
} as const;
