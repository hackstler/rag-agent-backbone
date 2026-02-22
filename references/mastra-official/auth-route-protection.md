# Auth y Route Protection

## Qué aporta
Mastra documenta protección de rutas de agentes/tools y despliegues con proveedores de identidad.

## Gap actual en repo
No hay capa auth obligatoria en `/chat` y `/ingest`; `orgId` llega opcional desde request.

## Recomendación mínima
- Requerir JWT (o sesión) en endpoints mutables.
- Derivar `orgId` desde token, no desde body/query.
- Limitar `documentIds` al tenant autenticado en SQL.
- Auditar llamadas a `searchWeb` por coste y cumplimiento.

## Opciones de proveedor
Clerk, Supabase Auth, Auth0, WorkOS (según ecosistema del producto).

## Referencias
- https://mastra.ai/docs
- https://mastra.ai/docs/deployment/custom-api-routes
- https://github.com/mastra-ai/mastra

