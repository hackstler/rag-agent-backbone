import { Hono } from "hono";
import { db } from "../db/client.js";
import { conversations, messages } from "../db/schema.js";
import { eq, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

const conversationsRouter = new Hono();

/**
 * GET /conversations
 * List conversations (optionally filter by userId via query param).
 */
conversationsRouter.get("/", async (c) => {
  const userId = c.req.query("userId");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);

  const result = await db.query.conversations.findMany({
    where: userId ? eq(conversations.userId, userId) : undefined,
    orderBy: desc(conversations.updatedAt),
    limit,
    columns: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return c.json(result);
});

/**
 * POST /conversations
 * Create a new conversation.
 */
conversationsRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : undefined;
  const title = typeof body.title === "string" ? body.title : "New conversation";

  const [conv] = await db
    .insert(conversations)
    .values({ userId, title })
    .returning({ id: conversations.id, title: conversations.title, createdAt: conversations.createdAt });

  return c.json(conv, 201);
});

/**
 * GET /conversations/:id
 * Get conversation with its message history.
 */
conversationsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: {
      messages: {
        orderBy: asc(messages.createdAt),
        columns: {
          id: true,
          role: true,
          content: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conv) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  return c.json(conv);
});

/**
 * DELETE /conversations/:id
 * Delete a conversation and all its messages.
 */
conversationsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const deleted = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning({ id: conversations.id });

  if (deleted.length === 0) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  return c.json({ deleted: true, id });
});

export default conversationsRouter;
