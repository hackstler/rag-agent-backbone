# Multi-Tenancy Rules

## Modelo de multi-tenancy
- `orgId` es un string libre (no FK) presente en users, documents, topics, sessions.
- Cada usuario pertenece a una sola org. Datos scoped por orgId.
- WhatsApp sessions son **per-user** (no per-org), con orgId denormalizado del user.
- Cascade delete: org → users → sessions, conversations, messages.

## Tabla `whatsappSessions`

Schema en `src/infrastructure/db/schema.ts`:

```typescript
export const whatsappSessions = pgTable('whatsapp_sessions', {
  id:        uuid('id').defaultRandom().primaryKey(),
  orgId:     text('org_id').notNull(),
  userId:    uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  status:    text('status').notNull().default('disconnected'), // disconnected | pending | qr | connected
  qrData:    text('qr_data'),
  phone:     text('phone'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

- Upsert con `onConflictDoUpdate` sobre `userId` (one session per user)
- `orgId` denormalizado del user record para queries rápidas (NOT unique)
- Cascade: borrar user → borra su sesión WhatsApp via FK

## WhatsApp Manager

Archivo: `src/application/managers/whatsapp.manager.ts`

Gestiona toda la lógica de sesiones WhatsApp:
- `getStatusForUser(userId)` — estado + phone del usuario autenticado
- `getQrForUser(userId)` — qrData si status = 'qr'
- `enableForUser(userId, orgId)` — crear sesión pending (409 si existe)
- `disconnectForUser(userId)` — marcar como disconnected
- `listActiveSessions()` — sesiones no-disconnected para el worker
- `reportQr(userId, qrData)` — upsert QR desde worker
- `reportStatus(userId, status, phone?)` — upsert status desde worker
- `resolveOrgId(userId)` — obtener orgId del user record

## Channel Controller (user-facing)

Archivo: `src/api/controllers/channel.controller.ts`

- Endpoints bajo `/channels/whatsapp/*`
- Auth: JWT de usuario (`authMiddleware`)
- **Siempre** filtrar por `c.get('user').userId` — sessions are per-user
- Endpoints:
  - `GET /channels/whatsapp/status` — session status + phone
  - `GET /channels/whatsapp/qr` — qrData (si status = 'qr')
  - `POST /channels/whatsapp/enable` — crear sesión pending (409 si existe)
  - `POST /channels/whatsapp/disconnect` — marcar disconnected

## Internal Controller (worker-facing)

Archivo: `src/api/controllers/internal.controller.ts`

- Endpoints bajo `/internal/whatsapp/*`
- Auth: JWT de worker (`requireWorker` middleware)
- Body validado con Zod en cada endpoint
- Todos aceptan `userId` (UUID) — orgId se resuelve del user record
- Endpoints:
  - `GET /internal/whatsapp/sessions` — sesiones activas como `[{ userId, orgId }]`
  - `POST /internal/whatsapp/qr` — upsert QR
  - `POST /internal/whatsapp/status` — upsert status/phone
  - `POST /internal/whatsapp/message` — inyectar mensaje al coordinator agent

## Guards de autenticación

Middleware en `src/api/middleware/auth.ts`:
- `authMiddleware()`: JWT (role: user|admin) → extrae `userId` + `orgId`
- `requireRole("admin")`: solo admins
- `requireWorker()`: JWT (role: worker)
- `optionalAuth()`: auth opcional

Montado en `src/app.ts`:
```typescript
app.use("/channels/*", auth)
app.route("/channels", createChannelController(deps))
app.use("/internal/*", workerAuth)
app.route("/internal", createInternalController(deps))
```
