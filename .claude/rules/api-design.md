# API Design Rules

## Stack
- **Hono** para todas las rutas. No usar Express, Fastify ni otros.
- Controllers en `src/api/controllers/` — uno por dominio. Montados en `src/app.ts`.
- Usar `hono/cors`, `hono/logger`, `hono/secure-headers` como middleware global.
- Plugins pueden registrar rutas propias via `routes()` en su definición.

## Estructura de controllers

| Controller | Rutas | Auth |
|---|---|---|
| `auth.controller.ts` | `/auth/register`, `/auth/login`, `/auth/me` | opcional / user |
| `admin.controller.ts` | `/admin/users/*`, `/admin/organizations/*` | admin |
| `document.controller.ts` | `/documents`, `/documents/:id` | user |
| `conversation.controller.ts` | `/conversations`, `/conversations/:id` | user |
| `topic.controller.ts` | `/topics`, `/topics/:id`, `/topics/:id/documents` | user |
| `channel.controller.ts` | `/channels/whatsapp/*` | user |
| `internal.controller.ts` | `/internal/whatsapp/*` | worker |
| `health.ts` | `/health` | - |
| Plugin RAG (routes) | `/chat`, `/ingest` | user |

## Patrón de controller
```typescript
// Controller = función factory que recibe dependencias (managers)
export function createXxxController(xxxManager: XxxManager) {
  const router = new Hono()
  // ...routes
  return router
}
```
- Controllers delgados: validar con Zod, delegar en manager, devolver respuesta.
- NO poner lógica de negocio en controllers — eso va en managers.

## Response format
```typescript
// Success
{ data: T }

// Error — SIEMPRE con ambos campos
{ error: "Category", message: "detail" }
// Categorías: NotFound, Conflict, Validation, Unauthorized, Forbidden, InternalError

// Paginado
{ items: T[], total: number, cursor?: string }
```

## HTTP status codes
- `200` — OK (GET, acción completada)
- `201` — Created (POST que crea recurso)
- `400` — Bad Request (validación fallida)
- `401` — Unauthorized (sin token o token inválido)
- `403` — Forbidden (sin permisos, role incorrecto)
- `404` — Not Found
- `409` — Conflict (duplicado)
- `500` — Internal Server Error
- `503` — Service Unavailable (DB down, en health check)

## Validación
- Validar **siempre** con Zod antes de procesar.
- Limitar tamaño de archivos (50MB máx en `/ingest`).
- Sanitizar queries: `z.string().min(1).max(10_000)` para queries de chat.

## SSE Streaming
- Content-Type: `text/event-stream`
- Formato de eventos: `data: ${JSON.stringify(event)}\n\n`
- Tipos de evento: `sources`, `text`, `done`, `error`
- Emitir `sources` primero (antes del primer token de texto).
- Emitir `done` al final siempre, incluso si hay error.

## Error handling
- DomainErrors se mapean automáticamente a HTTP status en `error-handler.middleware.ts`.
- Usar `app.onError()` como fallback global en `src/app.ts`.
- No exponer stack traces en producción.
- En streaming: emitir `{ type: "error", message: "..." }` y cerrar el stream.

## Autenticación
- **JWT Bearer**: `Authorization: Bearer <jwt>` — para usuarios y workers.
- **API-Key**: `X-API-Key` — para machine-to-machine.
- Middleware en `src/api/middleware/auth.ts`:
  - `authMiddleware()` — valida JWT/API-Key, extrae `user` (userId, orgId, role)
  - `requireRole("admin")` — restringe a admins
  - `requireWorker()` — valida JWT con `role: "worker"`
  - `optionalAuth()` — auth opcional (para register)
- Auth strategy configurable: `password` o `firebase` (via `AUTH_STRATEGY` env var)
