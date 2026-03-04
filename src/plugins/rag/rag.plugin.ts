import { Hono } from "hono";
import type { Plugin } from "../plugin.interface.js";
import type { ConversationManager } from "../../application/managers/conversation.manager.js";
import { ragAgent, ragTools } from "./rag.agent.js";
import { createChatRoutes } from "./routes/chat.routes.js";
import { createIngestRoutes } from "./routes/ingest.routes.js";

export class RagPlugin implements Plugin {
  readonly id = "rag";
  readonly name = "RAG Plugin";
  readonly description = "Retrieval-Augmented Generation with hybrid search, ingestion, and chat";
  readonly agent = ragAgent;
  readonly tools = ragTools;
  private convManager?: ConversationManager;

  setConversationManager(convManager: ConversationManager): void {
    this.convManager = convManager;
  }

  routes(): Hono {
    if (!this.convManager) {
      throw new Error("RagPlugin: convManager must be set before calling routes()");
    }
    const app = new Hono();

    app.route("/chat", createChatRoutes(this.agent, this.convManager));
    app.route("/ingest", createIngestRoutes());

    return app;
  }
}
