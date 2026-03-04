import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { GmailApiService } from "../services/gmail-api.service.js";

export interface ReadEmailDeps {
  gmailService: GmailApiService;
}

export function createReadEmailTool({ gmailService }: ReadEmailDeps) {
  return createTool({
    id: "readEmail",
    description:
      "Read the full content of a specific email by its message ID. Returns subject, sender, recipient, date, body text, and labels.",
    inputSchema: z.object({
      userId: z
        .string()
        .describe("User ID to retrieve the email for (from system context)"),
      messageId: z
        .string()
        .describe("The Gmail message ID to read"),
    }),
    outputSchema: z.object({
      id: z.string(),
      threadId: z.string(),
      subject: z.string(),
      from: z.string(),
      to: z.string(),
      date: z.string(),
      body: z.string(),
      labelIds: z.array(z.string()),
    }),
    execute: async ({ userId, messageId }) => {
      return gmailService.readEmail(userId, messageId);
    },
  });
}
