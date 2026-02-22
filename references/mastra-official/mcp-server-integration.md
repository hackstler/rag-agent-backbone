# MCP Server Integration

## Qué aporta
Mastra permite exponer capacidades vía MCP Server (stdio/SSE), útil para IDEs o agentes externos.

## Valor para este repo
Permite reutilizar `searchDocuments` y otros tools fuera del endpoint HTTP tradicional.

## Casos de uso
- Asistente interno en editor con acceso a tu KB.
- Integración con orquestadores multi-agent externos.
- Herramientas de soporte técnico con contexto del tenant.

## Requisitos de seguridad
- Auth por tenant.
- Rate limits.
- Allowlist de tools expuestos.
- Logging/auditoría.

## Referencias
- https://mastra.ai/docs
- https://github.com/mastra-ai/mastra

