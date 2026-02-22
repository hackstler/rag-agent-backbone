# RAG oficial con Vector Query Tool

## Qué aporta
Mastra incluye utilidades RAG como `createVectorQueryTool`, plantillas de prompt y configuración de vector stores.

## Valor para este repo
Hoy implementas retrieval SQL manual en `src/rag/retriever.ts`. Está bien para control fino; la utilidad oficial puede acelerar estandarización y reducir código repetitivo.

## Opciones realistas
1. Mantener SQL manual para máximo control de pgvector.
2. Introducir `createVectorQueryTool` en paralelo para comparar calidad/latencia.

## Configuración relevante
- Umbrales de score (`minScore`).
- Parámetros ANN (`probes`, `ef`) según índice y recall.
- Prompt base de grounding (`PGVECTOR_PROMPT`) para reducir alucinación.

## Estrategia recomendada
- Fase 1: benchmark A/B SQL manual vs tool oficial.
- Fase 2: adoptar el que gane en calidad + simplicidad + coste.

## Referencias
- https://mastra.ai/docs/rag/retrieval
- https://mastra.ai/reference/agents/agent
- https://github.com/mastra-ai/mastra

