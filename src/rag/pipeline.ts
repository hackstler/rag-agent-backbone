import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ragConfig } from "../config/rag.config.js";
import { retrieve, retrieveMultiQuery } from "./retriever.js";
import { rerank } from "./reranker.js";
import { transformQuery } from "./query-transformer.js";
import { db } from "../db/client.js";
import { messages, conversations } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";
import type { RetrievedChunk } from "./retriever.js";

// ============================================================
// LLM Clients (initialized lazily based on env)
// ============================================================

function getAnthropicClient(): Anthropic {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required in production");
  return new Anthropic({ apiKey });
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY is required in production");
  return new OpenAI({ apiKey });
}

// ============================================================
// Embeddings
// ============================================================

export async function createEmbedding(text: string): Promise<number[]> {
  const isLocal = process.env["NODE_ENV"] !== "production";

  if (isLocal && process.env["OLLAMA_BASE_URL"]) {
    return createOllamaEmbedding(text);
  }

  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: ragConfig.embeddingModel,
    input: text,
  });

  return response.data[0]!.embedding;
}

async function createOllamaEmbedding(text: string): Promise<number[]> {
  const baseUrl = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
  const model = ragConfig.embeddingModel;

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { embedding: number[] };
  return data.embedding;
}

// ============================================================
// LLM completion helper for query transformation
// ============================================================

const llmClient = {
  complete: async (prompt: string): Promise<string> => {
    const isLocal = process.env["NODE_ENV"] !== "production";

    if (isLocal && process.env["OLLAMA_BASE_URL"]) {
      const baseUrl = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ragConfig.llmModel,
          prompt,
          stream: false,
        }),
      });
      const data = (await response.json()) as { response: string };
      return data.response;
    }

    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: ragConfig.llmModel,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.content[0];
    return content?.type === "text" ? content.text : "";
  },
};

// ============================================================
// Context building
// ============================================================

function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant documents found for this query.";
  }

  return chunks
    .map((chunk, i) => {
      const source = chunk.documentTitle || chunk.documentSource;
      return `[${i + 1}] Source: ${source} (relevance: ${(chunk.score * 100).toFixed(0)}%)\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

function buildSystemPrompt(context: string): string {
  return `You are ${ragConfig.agentName}. ${ragConfig.agentDescription}

Use ONLY the following context to answer the user's question. If the answer is not in the context, say so clearly.
Always cite the source numbers [1], [2], etc. when referencing specific information.
${ragConfig.responseLanguage !== "en" ? `Respond in ${ragConfig.responseLanguage}.` : ""}

Context:
${context}`;
}

// ============================================================
// Conversation history
// ============================================================

async function getConversationHistory(
  conversationId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { memoryStrategy, windowSize } = ragConfig;

  if (memoryStrategy === "single-turn") return [];

  const history = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: asc(messages.createdAt),
    columns: { role: true, content: true },
  });

  const filtered = history.filter(
    (m) => m.role === "user" || m.role === "assistant"
  ) as Array<{ role: "user" | "assistant"; content: string }>;

  if (memoryStrategy === "fixed-window") {
    return filtered.slice(-windowSize * 2); // *2 for user+assistant pairs
  }

  return filtered;
}

// ============================================================
// Main RAG Pipeline
// ============================================================

export interface RagInput {
  query: string;
  conversationId: string;
  orgId?: string;
  documentIds?: string[];
}

export interface RagResult {
  answer: string;
  retrievedChunks: RetrievedChunk[];
  metadata: {
    queryEnhancement: string;
    rerankingEnabled: boolean;
    chunksRetrieved: number;
    model: string;
    latencyMs: number;
  };
}

export async function runRagPipeline(input: RagInput): Promise<RagResult> {
  const startTime = Date.now();
  const { query, conversationId, orgId, documentIds } = input;

  // 1. Query transformation
  const transformed = await transformQuery(
    query,
    ragConfig.queryEnhancement,
    llmClient,
    ragConfig.multiQueryCount
  );

  // 2. Create embeddings for all transformed queries
  const embeddings = await Promise.all(
    transformed.queries.map((q) => createEmbedding(q))
  );

  // 3. Retrieval
  const retrieverOptions = {
    topK: ragConfig.enableReranking ? ragConfig.topK * 3 : ragConfig.topK,
    similarityThreshold: ragConfig.similarityThreshold,
    orgId,
    documentIds,
  };

  let retrievedChunks: RetrievedChunk[];
  if (embeddings.length === 1) {
    retrievedChunks = await retrieve(embeddings[0]!, retrieverOptions);
  } else {
    retrievedChunks = await retrieveMultiQuery(embeddings, retrieverOptions);
  }

  // 4. Reranking (optional)
  if (ragConfig.enableReranking && retrievedChunks.length > 0) {
    retrievedChunks = await rerank(query, retrievedChunks, {
      topK: ragConfig.rerankTopK,
      provider: process.env["COHERE_API_KEY"] ? "cohere" : "local",
    });
  } else {
    retrievedChunks = retrievedChunks.slice(0, ragConfig.topK);
  }

  // 5. Build context and prompt
  const context = buildContext(retrievedChunks);
  const systemPrompt = buildSystemPrompt(context);
  const history = await getConversationHistory(conversationId);

  // 6. LLM generation
  const answer = await generateAnswer(systemPrompt, history, query);

  const latencyMs = Date.now() - startTime;

  return {
    answer,
    retrievedChunks,
    metadata: {
      queryEnhancement: ragConfig.queryEnhancement,
      rerankingEnabled: ragConfig.enableReranking,
      chunksRetrieved: retrievedChunks.length,
      model: ragConfig.llmModel,
      latencyMs,
    },
  };
}

async function generateAnswer(
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  query: string
): Promise<string> {
  const isLocal = process.env["NODE_ENV"] !== "production";

  if (isLocal && process.env["OLLAMA_BASE_URL"]) {
    return generateWithOllama(systemPrompt, history, query);
  }

  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: ragConfig.llmModel,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      ...history,
      { role: "user", content: query },
    ],
  });

  const content = response.content[0];
  return content?.type === "text" ? content.text : "";
}

async function generateWithOllama(
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  query: string
): Promise<string> {
  const baseUrl = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
  const allMessages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: query },
  ];

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ragConfig.llmModel,
      messages: allMessages,
      stream: false,
    }),
  });

  const data = (await response.json()) as { message: { content: string } };
  return data.message.content;
}

// ============================================================
// Streaming RAG Pipeline (SSE)
// ============================================================

export async function* runRagPipelineStream(
  input: RagInput
): AsyncGenerator<string> {
  const { query, conversationId, orgId, documentIds } = input;

  // Steps 1-5 same as non-streaming
  const transformed = await transformQuery(
    query,
    ragConfig.queryEnhancement,
    llmClient,
    ragConfig.multiQueryCount
  );

  const embeddings = await Promise.all(
    transformed.queries.map((q) => createEmbedding(q))
  );

  const retrieverOptions = {
    topK: ragConfig.enableReranking ? ragConfig.topK * 3 : ragConfig.topK,
    similarityThreshold: ragConfig.similarityThreshold,
    orgId,
    documentIds,
  };

  let retrievedChunks: RetrievedChunk[];
  if (embeddings.length === 1) {
    retrievedChunks = await retrieve(embeddings[0]!, retrieverOptions);
  } else {
    retrievedChunks = await retrieveMultiQuery(embeddings, retrieverOptions);
  }

  if (ragConfig.enableReranking && retrievedChunks.length > 0) {
    retrievedChunks = await rerank(query, retrievedChunks, {
      topK: ragConfig.rerankTopK,
      provider: process.env["COHERE_API_KEY"] ? "cohere" : "local",
    });
  } else {
    retrievedChunks = retrievedChunks.slice(0, ragConfig.topK);
  }

  const context = buildContext(retrievedChunks);
  const systemPrompt = buildSystemPrompt(context);
  const history = await getConversationHistory(conversationId);

  // Emit sources first
  yield `data: ${JSON.stringify({ type: "sources", chunks: retrievedChunks.map((c) => ({ id: c.id, title: c.documentTitle, score: c.score })) })}\n\n`;

  // Stream the answer
  const isLocal = process.env["NODE_ENV"] !== "production";

  if (isLocal && process.env["OLLAMA_BASE_URL"]) {
    yield* streamWithOllama(systemPrompt, history, query);
  } else {
    yield* streamWithAnthropic(systemPrompt, history, query);
  }

  yield `data: ${JSON.stringify({ type: "done" })}\n\n`;
}

async function* streamWithAnthropic(
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  query: string
): AsyncGenerator<string> {
  const anthropic = getAnthropicClient();

  const stream = await anthropic.messages.create({
    model: ragConfig.llmModel,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [...history, { role: "user", content: query }],
    stream: true,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`;
    }
  }
}

async function* streamWithOllama(
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  query: string
): AsyncGenerator<string> {
  const baseUrl = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
  const allMessages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: query },
  ];

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ragConfig.llmModel,
      messages: allMessages,
      stream: true,
    }),
  });

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
        if (data.message?.content) {
          yield `data: ${JSON.stringify({ type: "text", text: data.message.content })}\n\n`;
        }
      } catch {
        // Skip malformed lines
      }
    }
  }
}
