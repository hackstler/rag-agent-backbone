# Agent: Setup

> Implementado como slash command: `/setup` (`.claude/commands/setup.md`)

Configura el agente RAG para un cliente nuevo. Invocarlo con `/setup`.

## Archivos que gestiona
| Archivo | Qué escribe |
|---------|-------------|
| `setup-responses.md` | Memoria persistente del wizard |
| `src/plugins/rag/config/rag.config.ts` | agentName, useCase, language, chunking |
| `src/plugins/rag/config/tools.config.ts` | searchWeb enabled/disabled |
| `CLAUDE.md` | Sección Propósito |
| `.env.example` | Keys necesarias |
