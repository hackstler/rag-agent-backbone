# Contrato de Streaming (Mastra -> SSE)

## Qué aporta
Mastra emite eventos de stream tipados (`text-delta`, tool calls/results, etc.).

## Encaje con tu implementación
`src/api/chat.ts` ya traduce eventos Mastra a SSE custom (`sources`, `text`, `done`, `error`).

## Recomendación
- Definir contrato versionado en un doc compartido backend/frontend.
- Añadir campo `eventVersion` y `requestId` para debugging.
- Capturar eventos de tool timeout/error en canal explícito.

## Beneficio
Evita breakages silenciosos cuando cambie formato de evento o frontend.

## Referencias
- https://mastra.ai/en/reference/streaming/agents/stream
- https://mastra.ai/reference/agents/agent

