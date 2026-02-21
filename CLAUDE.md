# rag-agent-backbone

## Propósito
Template production-ready para desplegar agentes RAG de nivel empresarial. Cualquier equipo puede copiar este repo, responder el `initial-setup.md` y tener infraestructura RAG lista sin configurar nada desde cero.

## Stack Técnico
- **Runtime**: Node.js + TypeScript strict
- **API**: Hono (edge-first, SSE nativo)
- **LLM Orchestration**: Mastra.ai (TypeScript nativo, RAG module nativo)
- **Vector DB**: PostgreSQL + pgvector (un solo DATABASE_URL)
- **ORM**: Drizzle (lightweight, SQL-first)
- **Embeddings (prod)**: OpenAI `text-embedding-3-small` (1536-dim)
- **Embeddings (local)**: Ollama `nomic-embed-text`
- **LLM (prod)**: Claude 3.5 Sonnet
- **LLM (local)**: Ollama `mistral`
- **Streaming**: SSE via Hono
- **Deploy local**: Docker Compose (postgres+pgvector + ollama + app)
- **Deploy prod**: Railway (API) + Supabase (DB)

## Estructura clave
```
src/api/       → Hono routes (chat, ingest, conversations, health)
src/rag/       → Pipeline RAG Mastra (pipeline, retriever, reranker, chunker)
src/ingestion/ → Document ingestion (loader, processor, watcher)
src/db/        → Drizzle schema + migrations + client
src/config/    → rag.config.ts generado por initial-setup.md
references/    → Git subtrees de repos oficiales (LangChain + Vercel AI SDK)
```

## Convenciones
- Toda la configuración vive en `src/config/rag.config.ts` (generada por wizard)
- Local ↔ Producción: mismo código, solo variables de entorno cambian
- Sin choices ambiguas en runtime: stack fijo y determinista
- Secrets siempre en `.env`, nunca hardcoded

## Comandos principales
```bash
npm run dev          # Development con hot reload
npm run build        # Build producción
npm run migrate      # Aplicar migraciones Drizzle
npm run seed         # Datos de prueba
npm run ingest       # Ingestar documentos desde CLI
docker-compose up    # Stack local completo
```

## Variables de entorno requeridas
Ver `.env.example` para la lista completa.
Mínimo para local: `DATABASE_URL` (o usa docker-compose que lo configura)
Mínimo para prod: `DATABASE_URL` + `OPENAI_API_KEY` + `ANTHROPIC_API_KEY`

## Referencia de patrones RAG
Ver `RAG-REFERENCE.md` para cheatsheet de patrones y decisiones de diseño.

## Setup inicial
Responder `initial-setup.md` genera automáticamente:
- `src/config/rag.config.ts`
- `.env.example` adaptado al caso de uso
- `docker-compose.yml` con servicios necesarios
- Actualiza este `CLAUDE.md` con el contexto del proyecto
