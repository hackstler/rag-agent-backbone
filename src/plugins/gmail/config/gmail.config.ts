export const gmailConfig = {
  agentName: "GmailAgent",
  maxResults: 20,
  scopes: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
  ],
} as const;
