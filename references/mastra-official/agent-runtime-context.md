# Agent Runtime Context (aplicable a este repo)

## Qué aporta
Mastra permite pasar `runtimeContext` tipado al agente y que tools/workflows lean contexto de ejecución (tenant, permisos, filtros, flags).

## Por qué te aporta valor aquí
Hoy pasas `threadId` y `resourceId`, pero `orgId/documentIds` viajan mezclados entre endpoint, tool input y defaults. `runtimeContext` centraliza esto y evita inconsistencias.

## Aplicación propuesta
- Definir `RuntimeContext` común:
  - `orgId: string`
  - `documentIds?: string[]`
  - `role?: 'admin' | 'member'`
  - `locale?: string`
- Leerlo en `searchDocuments` para forzar filtros multi-tenant sin depender del prompt.

## Patrón
1. API valida auth + extrae claims.
2. Construye runtime context.
3. Llama `agent.generate/stream` con ese contexto.
4. Tool usa contexto para consultas SQL.

## Riesgo que resuelve
Evita que un tool reciba un `orgId` incorrecto desde input de usuario.

## Referencias
- https://mastra.ai/docs/agents/runtime-context
- https://mastra.ai/reference/agents/agent

