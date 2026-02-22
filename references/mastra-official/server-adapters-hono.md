# Mastra Server Adapters con Hono

## Qué aporta
Mastra 1.0 introdujo server adapters para exponer endpoints de agente/workflow en frameworks como Hono.

## Valor para este repo
Ya usas Hono. El adapter puede:
- reducir boilerplate en rutas de agent ops,
- estandarizar handlers de runtime,
- facilitar upgrades alineados con Mastra core.

## Estrategia de adopción
- No reemplazar de golpe `src/api/chat.ts`.
- Probar adapter en una ruta nueva (`/mastra/*`) con feature flag.
- Mantener compatibilidad con SSE actual mientras se valida.

## Referencias
- https://mastra.ai/blog/mastra-server-adapters
- https://mastra.ai/docs/deployment/custom-api-routes
- https://github.com/mastra-ai/mastra

