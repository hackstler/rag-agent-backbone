import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { GmailApiService } from "../services/gmail-api.service.js";

export interface ListEmailsDeps {
  gmailService: GmailApiService;
}

export function createListEmailsTool({ gmailService }: ListEmailsDeps) {
  return createTool({
    id: "listEmails",
    description:
      "List recent emails from the user's Gmail inbox. Requires the user's Google account to be connected.",
    inputSchema: z.object({
      userId: z
        .string()
        .describe("User ID to retrieve emails for (from system context)"),
      maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Maximum number of emails to return (default: 10)"),
    }),
    outputSchema: z.object({
      emails: z.array(
        z.object({
          id: z.string(),
          subject: z.string(),
          from: z.string(),
          date: z.string(),
          snippet: z.string(),
        }),
      ),
      totalResults: z.number(),
    }),
    execute: async ({ userId, maxResults }) => {
      const result = await gmailService.listEmails(userId, maxResults ?? 10);
      return {
        emails: result.map((e) => ({
          id: e.id,
          subject: e.subject,
          from: e.from,
          date: e.date,
          snippet: e.snippet,
        })),
        totalResults: result.length,
      };
    },
  });
}
