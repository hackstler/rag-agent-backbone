# Multi-Tenancy Rules

## Tabla `whatsappSessions`

Schema con Drizzle en `src/db/schema.ts`:

```typescript
export const whatsappSessions = pgTable('whatsapp_sessions', {
  id:        uuid('id').defaultRandom().primaryKey(),
  orgId:     text('org_id').notNull(),
  status:    text('status').notNull().default('disconnected'), // disconnected | qr | connected
  qrData:    text('qr_data'),
  phone:     text('phone'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

- Migración: `0003_add_whatsapp_sessions.sql`
- Upsert con `onConflictDoUpdate` sobre `orgId` (un solo session por org)
- Exportar tipos: `WhatsAppSession` / `NewWhatsAppSession`

## Router `channels.ts` (user-facing)

Archivo: `src/api/channels.ts`

- Endpoints bajo `/channels/whatsapp/*`
- Autenticación: JWT de usuario (`requireUser` middleware)
- **Siempre** filtrar por `c.get('user').orgId` — nunca exponer datos de otra org
- Endpoints:
  - `GET /channels/whatsapp/status` → estado + phone de la sesión
  - `GET /channels/whatsapp/qr` → qrData actual (si status = 'qr')
  - `POST /channels/whatsapp/disconnect` → marcar desconexión

## Router `internal.ts` (worker-facing)

Archivo: `src/api/internal.ts`

- Endpoints bajo `/internal/whatsapp/*`
- Autenticación: JWT de worker (`requireWorker` middleware)
- Body validado con Zod en cada endpoint
- Endpoints:
  - `POST /internal/whatsapp/qr` → upsert sesión con qrData
  - `POST /internal/whatsapp/status` → upsert sesión con status/phone
  - `POST /internal/whatsapp/message` → inyectar mensaje al ragAgent con orgId

## Guards de autenticación

- `requireUser`: valida JWT con `role: "user"`, extrae `userId` + `orgId`
- `requireWorker`: valida JWT con `role: "worker"`, extrae `orgId` (sin userId)
- Ambos middleware en `src/api/middleware/auth.ts`
- Montar en `src/index.ts`:
  ```typescript
  app.route('/channels', requireUser, channelsRouter)
  app.route('/internal', requireWorker, internalRouter)
  ```

## Restricciones

- **NO tocar** schema existente (users, documents, chunks, conversations, messages)
- **NO tocar** pipeline RAG (retriever, embedder, chunker, reranker)
- **NO tocar** auth existente (login, register, JWT de usuario)
- El endpoint `/internal/whatsapp/message` pasa `orgId` al ragAgent como `resourceId`
