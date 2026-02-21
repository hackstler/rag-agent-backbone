import { Hono } from "hono";
import { stream } from "hono/streaming";
import { z } from "zod";
import { runRagPipeline, runRagPipelineStream } from "../rag/pipeline.js";
import { db } from "../db/client.js";
import { messages, conversations } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const chat = new Hono();

const chatSchema = z.object({
  query: z.string().min(1).max(10_000),
  conversationId: z.string().uuid().optional(),
  orgId: z.string().optional(),
  documentIds: z.array(z.string().uuid()).optional(),
});

/**
 * POST /chat
 * Send a message and get a complete JSON response.
 * Creates a new conversation if no conversationId is provided.
 */
chat.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const { query, orgId, documentIds } = parsed.data;
  const conversationId = await resolveConversationId(parsed.data.conversationId);

  const startTime = Date.now();
  const result = await runRagPipeline({ query, conversationId, orgId, documentIds });

  // Persist user message and assistant response
  await persistMessages(conversationId, query, result.answer, {
    latencyMs: result.metadata.latencyMs,
    model: result.metadata.model,
    retrievedChunks: result.retrievedChunks.map((c) => c.id),
  });

  return c.json({
    conversationId,
    answer: result.answer,
    sources: result.retrievedChunks.map((chunk) => ({
      id: chunk.id,
      documentTitle: chunk.documentTitle,
      documentSource: chunk.documentSource,
      score: chunk.score,
      excerpt: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? "…" : ""),
    })),
    metadata: result.metadata,
  });
});

/**
 * GET /chat/stream?query=...&conversationId=...
 * Stream the response as Server-Sent Events (SSE).
 *
 * Event types:
 *   { type: "sources", chunks: [...] }   — retrieved context (first)
 *   { type: "text", text: "..." }         — streamed answer tokens
 *   { type: "done" }                      — stream complete
 *   { type: "error", message: "..." }     — error occurred
 */
chat.get("/stream", async (c) => {
  const queryParam = c.req.query("query");
  const conversationIdParam = c.req.query("conversationId");
  const orgId = c.req.query("orgId");

  if (!queryParam?.trim()) {
    return c.json({ error: "Missing 'query' query parameter" }, 400);
  }

  const parsed = chatSchema.safeParse({
    query: queryParam,
    conversationId: conversationIdParam ?? undefined,
    orgId,
  });

  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const { query } = parsed.data;
  const conversationId = await resolveConversationId(parsed.data.conversationId);

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  c.header("X-Conversation-Id", conversationId);

  return stream(c, async (stream) => {
    let fullAnswer = "";
    let sources: Array<{ id: string; title: string; score: number }> = [];

    try {
      for await (const event of runRagPipelineStream({
        query,
        conversationId,
        orgId: parsed.data.orgId,
        documentIds: parsed.data.documentIds,
      })) {
        await stream.write(event);

        // Parse events to capture full answer for persistence
        try {
          const raw = event.replace(/^data: /, "").trim();
          const parsed = JSON.parse(raw) as { type: string; text?: string; chunks?: typeof sources };
          if (parsed.type === "text" && parsed.text) fullAnswer += parsed.text;
          if (parsed.type === "sources" && parsed.chunks) sources = parsed.chunks;
        } catch {
          // ignore parse errors
        }
      }

      // Persist after stream completes
      if (fullAnswer) {
        await persistMessages(conversationId, query, fullAnswer, {
          model: process.env["NODE_ENV"] === "production" ? "claude-3-5-sonnet" : "ollama",
          retrievedChunks: sources.map((s) => s.id),
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Internal error";
      await stream.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
    }
  });
});

// ============================================================
// Helpers
// ============================================================

async function resolveConversationId(id?: string): Promise<string> {
  if (id) {
    // Verify conversation exists
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      columns: { id: true },
    });
    if (conv) return id;
  }

  // Create new conversation
  const [conv] = await db
    .insert(conversations)
    .values({ title: "New conversation" })
    .returning({ id: conversations.id });

  return conv!.id;
}

async function persistMessages(
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
  metadata: {
    latencyMs?: number;
    model?: string;
    retrievedChunks?: string[];
  }
): Promise<void> {
  await db.insert(messages).values([
    {
      conversationId,
      role: "user",
      content: userMessage,
    },
    {
      conversationId,
      role: "assistant",
      content: assistantMessage,
      metadata,
    },
  ]);

  // Update conversation's updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

export default chat;
