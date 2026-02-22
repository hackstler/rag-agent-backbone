# Observabilidad con Langfuse

## Qué aporta
Mastra integra providers de observabilidad, incluido Langfuse, para trazas de agentes/tools/workflows.

## Valor para este repo
Ya depende de `langfuse`, pero no hay guía operativa unificada para producción.

## Recomendación
- Estandarizar tags:
  - `agentId`, `conversationId`, `orgId`, `toolName`, `model`.
- Registrar métricas mínimas:
  - latencia total,
  - latencia por tool,
  - tokens in/out,
  - coste estimado,
  - tasa de fallback web,
  - recall útil (chunks usados en respuesta).
- Enlazar `requestId` API con trace id.

## Referencias
- https://mastra.ai/en/reference/observability/providers/langfuse
- https://mastra.ai/docs
- https://github.com/mastra-ai/mastra

