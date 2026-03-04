# Hono + Drizzle + Mastra — Deep Stack Rules

Complementa las reglas en `api-design.md`, `data-model.md`, `rag-pipeline.md` y `plugins.md`.

---

## Hono

### Middleware chain (orden estricto)
```
logger → secureHeaders → cors → auth → route handler
```
No alterar el orden. Auth siempre después de CORS.

### Context variables
```typescript
declare module 'hono' {
  interface ContextVariableMap {
    user: { userId: string; orgId: string; role: "user" | "admin" }
    workerOrgId: string  // set by requireWorker (optional)
  }
}

// En handlers
const user = c.get("user")       // authMiddleware
const orgId = c.get("workerOrgId") // requireWorker
```

### App factory
```typescript
// src/app.ts — crea la app Hono con todas las rutas
export function createApp(deps: AppDeps): Hono {
  const app = new Hono()
  // middleware global
  // rutas de controllers
  // rutas de plugins (via pluginRegistry.getRoutes())
  // error handler
  return app
}
```

### Validación
- Validar con Zod **antes** de procesar cualquier input
- `const body = schema.parse(await c.req.json())`
- `const query = schema.parse(c.req.query())`

### Response format
```typescript
return c.json({ data: result })
return c.json({ error: "Validation", message: "Invalid input" }, 400)
```

---

## Drizzle

### UUIDs
```typescript
id: uuid('id').defaultRandom().primaryKey()
```

### Timestamps
```typescript
createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
```

### Upserts atómicos
```typescript
await db.insert(table)
  .values(data)
  .onConflictDoUpdate({
    target: table.uniqueColumn,
    set: { ...updates, updatedAt: new Date() }
  })
```

### Relations
```typescript
export const tableRelations = relations(table, ({ one, many }) => ({
  parent: one(parentTable, { fields: [table.parentId], references: [parentTable.id] }),
  children: many(childTable),
}))
```

### Type inference
```typescript
// Infrastructure types (src/infrastructure/db/schema.ts)
export type Session = typeof whatsappSessions.$inferSelect
export type NewSession = typeof whatsappSessions.$inferInsert

// Domain entities (src/domain/entities/index.ts) — pure interfaces
// Domain/Application importan de domain, NO de schema
```

### Pool singleton
```typescript
const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  max: 10,
  idleTimeoutMillis: 30_000,
})
```
Un solo pool por proceso. No crear pools por request.

---

## Mastra

### Agent
```typescript
const agent = new Agent({
  id: "coordinator",
  name: "Emilio",
  instructions: systemPrompt,
  model: geminiModel,
  tools: pluginRegistry.getAllTools(),  // tools de TODOS los plugins
  memory: postgresMemory,
})
```

### Memory (multi-tenant)
```typescript
const memory = new PostgresStore({
  connectionString: process.env["DATABASE_URL"],
  schemaName: "mastra",  // schema separado del app schema
})
```
- **Thread** = conversationId (cada conversación es un thread)
- **Resource** = orgId (para aislamiento multi-tenant)

### Tools — Plugin Pattern
```typescript
// Cada plugin expone tools via su propiedad `tools`
// El coordinator las recibe todas agregadas por pluginRegistry.getAllTools()

// Dentro de un plugin, tools siguen el factory pattern:
export function createSearchDocumentsTool(deps: ToolDeps) {
  return createTool({
    id: "searchDocuments",
    description: "...",
    inputSchema: z.object({ ... }),
    execute: async ({ context }) => { ... }
  })
}
```

### Payload unwrapping (Mastra 1.5+)
Mastra wraps tool results en `.payload`:
```typescript
const result = await tool.execute(input) as { payload: T }
const data = result.payload
```

### System prompt
Secciones con `== TÍTULO ==` y template literals:
```typescript
const systemPrompt = `
== ROL ==
Eres Emilio, asistente especializado...

== HERRAMIENTAS ==
${pluginDescriptions}

== REGLAS ==
...
`
```
