import { Hono } from "hono";
import { z } from "zod";
import type { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import type { WhatsAppManager } from "../../application/managers/whatsapp.manager.js";
import type { ConversationManager } from "../../application/managers/conversation.manager.js";
import { extractSources } from "../helpers/extract-sources.js";
import { formatForWhatsApp, buildSourcesFooter } from "../helpers/format-whatsapp.js";
import { ragConfig } from "../../plugins/rag/config/rag.config.js";

interface DocumentAttachment {
  pdfBase64: string;
  filename: string;
}

/**
 * Deep-search any object tree for a node containing pdfBase64 + filename.
 * Avoids depending on a specific Mastra payload wrapper structure.
 */
function deepFindPdf(obj: unknown, depth = 0): DocumentAttachment | null {
  if (depth > 10 || obj == null || typeof obj !== "object") return null;

  const rec = obj as Record<string, unknown>;

  // Check if THIS object has the PDF fields
  if (
    typeof rec["pdfBase64"] === "string" && rec["pdfBase64"].length > 0 &&
    typeof rec["filename"] === "string" && rec["filename"].length > 0
  ) {
    return { pdfBase64: rec["pdfBase64"] as string, filename: rec["filename"] as string };
  }

  // Recurse into arrays and object values
  const values = Array.isArray(obj) ? obj : Object.values(rec);
  for (const v of values) {
    const found = deepFindPdf(v, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Scans agent result steps for a PDF attachment (from calculateBudget tool).
 * Uses deep recursive search to be resilient to Mastra payload wrapping changes.
 */
function extractPdfFromSteps(
  steps: Array<{ toolResults?: Array<unknown> }>
): DocumentAttachment | null {
  return deepFindPdf(steps);
}

const qrSchema = z.object({
  qrData: z.string().min(1),
  userId: z.string().uuid(),
});

const statusSchema = z.object({
  status: z.enum(["connected", "disconnected"]),
  phone: z.string().optional(),
  userId: z.string().uuid(),
});

const messageSchema = z.object({
  messageId: z.string().min(1),
  body: z.string().min(1).max(10_000),
  chatId: z.string().min(1),
  userId: z.string().uuid(),
});

/**
 * Unwraps nested toolResults from delegation steps.
 *
 * When the coordinator delegates to a sub-agent, the delegation tool returns
 * { text, toolResults } inside a Mastra payload wrapper. This function extracts
 * the nested toolResults so that extractSources() can find them as if the
 * tools had been called directly.
 */
function unwrapDelegationSteps(
  steps: Array<{ toolResults?: Array<unknown> }>
): Array<{ toolResults?: Array<unknown> }> {
  const unwrapped: Array<{ toolResults?: Array<unknown> }> = [];

  for (const step of steps) {
    const allToolResults = step.toolResults ?? [];

    const delegationResult = allToolResults.find((r) => {
      const payload = (r as { payload?: { toolName?: string } }).payload;
      const name = payload?.toolName ?? "";
      return name.startsWith("delegate-to-") || name.startsWith("delegateTo_");
    });

    if (delegationResult) {
      const payload = (delegationResult as {
        payload: { result?: { toolResults?: Array<unknown> } };
      }).payload;
      const nested = payload.result?.toolResults ?? [];
      if (nested.length > 0) {
        unwrapped.push({ toolResults: nested });
      }
    } else {
      unwrapped.push(step);
    }
  }

  return unwrapped.length > 0 ? unwrapped : steps;
}

export function createInternalController(
  waManager: WhatsAppManager,
  convManager: ConversationManager,
  agent: Agent,
): Hono {
  const router = new Hono();

  router.get("/whatsapp/sessions", async (c) => {
    const rows = await waManager.listActiveSessions();
    return c.json({ data: rows });
  });

  router.post("/whatsapp/qr", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = qrSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);

    const result = await waManager.reportQr(parsed.data.userId, parsed.data.qrData);
    return c.json({ data: result });
  });

  router.post("/whatsapp/status", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);

    const result = await waManager.reportStatus(
      parsed.data.userId,
      parsed.data.status,
      parsed.data.phone,
    );
    return c.json({ data: result });
  });

  router.post("/whatsapp/message", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);

    const { userId, body: messageBody, chatId } = parsed.data;

    const orgId = await waManager.resolveOrgId(userId);

    try {
      const conversationId = await convManager.resolveOrCreateByTitle(
        `whatsapp:${chatId}`,
        userId,
      );

      const requestContext = new RequestContext([['userId', userId], ['orgId', orgId]]);

      const result = await agent.generate(messageBody, {
        requestContext,
        memory: { thread: conversationId, resource: orgId },
      });

      const replyText = result.text?.trim();
      if (!replyText) {
        console.error("[internal/message] agent returned empty response", {
          userId,
          steps: result.steps?.length ?? 0,
        });
        return c.json({
          data: { reply: "Lo siento, no pude procesar tu solicitud. Por favor, inténtalo de nuevo." },
        });
      }

      const steps = unwrapDelegationSteps(result.steps ?? []);
      const sources = extractSources(steps);

      // Persist messages separately — don't let a DB error kill the reply
      try {
        await convManager.persistMessages(conversationId, messageBody, replyText, {
          model: ragConfig.llmModel,
          retrievedChunks: sources.map((s) => s.id),
        });
      } catch (persistError) {
        console.error("[internal/message] failed to persist messages:", persistError);
      }

      const waText = formatForWhatsApp(replyText) + buildSourcesFooter(sources);

      // Check for PDF attachment from quote tool
      const document = extractPdfFromSteps(result.steps ?? []);

      if (document) {
        console.log("[internal/message] PDF found:", document.filename);
      } else {
        // Log step structure to debug missing PDFs
        const stepSummary = (result.steps ?? []).map((s, i) => ({
          step: i,
          toolResults: (s.toolResults ?? []).map((tr) => {
            const p = (tr as { payload?: { toolName?: string } }).payload;
            return p?.toolName ?? "unknown";
          }),
        }));
        console.log("[internal/message] no PDF found. steps:", JSON.stringify(stepSummary));
      }

      return c.json({
        data: { reply: waText, ...(document ? { document } : {}) },
      });
    } catch (error) {
      console.error("[internal/message] agent error:", error);
      return c.json({ error: "Agent unavailable" }, 503);
    }
  });

  return router;
}
