# Memory, Threads y Recall

## Qué aporta
Mastra maneja memoria por `thread` y `resource`, permitiendo historiales aislados y estrategias de recall.

## Estado actual del repo
- Ya usas `@mastra/memory` + `@mastra/pg`.
- También guardas historial en tus tablas (`conversations/messages`).

## Riesgo actual
Doble fuente de verdad para conversación (Mastra y DB propia), potencial divergencia.

## Recomendación
- Definir fuente canónica para runtime del agente (Mastra thread).
- Mantener tablas propias como auditoría/analytics y no como estado operativo.
- Alinear `conversationId` <-> `threadId` explícitamente.

## Mejora de calidad
Habilitar recall semántico selectivo en conversaciones largas para reducir pérdida de contexto (si coste lo permite).

## Referencias
- https://mastra.ai/reference/memory/createThread
- https://mastra.ai/docs
- https://github.com/mastra-ai/mastra

