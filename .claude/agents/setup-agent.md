# Agent: RAG Setup

> **Entrada principal: `/setup`**
> Este agente está implementado como slash command en `.claude/commands/setup.md`.
> Invócalo con `/setup` en Claude Code.

---

## Referencia rápida

| Comando | Cuándo |
|---------|--------|
| `/setup` | Primera vez con un cliente nuevo, o para cambiar la config |
| `/add-tool` | Añadir una integración (REST API, DB, script, lógica interna) |
| `/status` | Ver configuración actual + tools activas + estado del servidor |

---

## Flujo completo de onboarding

```
1. git clone rag-agent-backbone <nombre-proyecto>
2. cd <nombre-proyecto> && npm install
3. /setup  →  responde 4 preguntas  →  archivos generados
4. cp .env.example .env  →  añade API keys
5. docker-compose up  (PostgreSQL + pgvector)
6. npm run dev
7. /ingest ./docs/  →  indexa los documentos del cliente
8. POST http://localhost:3000/chat  →  prueba que funciona
```

## Añadir una integración

```
/add-tool  →  elige tipo (REST / DB / Script / Lógica)  →  responde preguntas  →  código generado
```

## Archivos que maneja el setup

| Archivo | Qué escribe |
|---------|-------------|
| `setup-responses.md` | Memoria persistente de las respuestas del wizard |
| `src/config/rag.config.ts` | agentName, agentDescription, useCase, responseLanguage |
| `src/config/tools.config.ts` | searchWeb enabled/disabled |
| `CLAUDE.md` | Sección Propósito actualizada |
| `.env.example` | PERPLEXITY_API_KEY si web search activo |
