import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { ragConfig } from "../config/rag.config.js";

export function resolveProvider(): "gemini" | "anthropic" | "ollama" {
  if (process.env["GOOGLE_API_KEY"] ?? process.env["GOOGLE_GENERATIVE_AI_API_KEY"]) return "gemini";
  if (process.env["NODE_ENV"] === "production") return "anthropic";
  return "ollama";
}

function getGoogleClient(): GoogleGenerativeAI {
  const apiKey = process.env["GOOGLE_API_KEY"] ?? process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
  if (!apiKey) throw new Error("GOOGLE_API_KEY is required for Gemini");
  return new GoogleGenerativeAI(apiKey);
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY is required in production");
  return new OpenAI({ apiKey });
}

export async function createEmbedding(text: string): Promise<number[]> {
  const provider = resolveProvider();
  if (provider === "gemini") return createGeminiEmbedding(text);
  if (provider === "ollama") return createOllamaEmbedding(text);

  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: ragConfig.embeddingModel,
    input: text,
  });
  return response.data[0]!.embedding;
}

async function createGeminiEmbedding(text: string): Promise<number[]> {
  const google = getGoogleClient();
  const model = google.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: 768,
  } as Parameters<typeof model.embedContent>[0]);
  return result.embedding.values;
}

async function createOllamaEmbedding(text: string): Promise<number[]> {
  const baseUrl = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
  const model = process.env["OLLAMA_EMBED_MODEL"] ?? "nomic-embed-text";
  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });
  if (!response.ok) throw new Error(`Ollama embedding failed: ${response.statusText}`);
  const data = (await response.json()) as { embedding: number[] };
  return data.embedding;
}
