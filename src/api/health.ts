import { Hono } from "hono";
import { checkDbConnection } from "../db/client.js";

const health = new Hono();

health.get("/", async (c) => {
  const dbOk = await checkDbConnection();

  const ollamaOk = await checkOllama();

  const status = dbOk ? "ok" : "degraded";
  const httpStatus = dbOk ? 200 : 503;

  return c.json(
    {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? "ok" : "error",
        ollama: ollamaOk ? "ok" : "unavailable",
      },
      version: "0.1.0",
    },
    httpStatus
  );
});

async function checkOllama(): Promise<boolean> {
  const baseUrl = process.env["OLLAMA_BASE_URL"];
  if (!baseUrl) return false;

  try {
    const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

export default health;
