# Data Model Rules

## Schema — Drizzle conventions
- Siempre usar `uuid` con `defaultRandom()` para PKs. No usar enteros autoincrementales.
- Timestamps: siempre `withTimezone: true`. Almacenar en UTC, formatear en frontend.
- Nombres de columnas: `snake_case` en DB, `camelCase` en TypeScript (Drizzle mapea automáticamente).
- Usar `jsonb` para metadata flexible. Tipar con `.$type<T>()` para type-safety.

## Tablas actuales

| Tabla | Propósito | FK cascade |
|-------|-----------|------------|
| `users` | Usuarios con email, orgId, metadata (role, auth) | - |
| `conversations` | Conversaciones de chat | userId → users |
| `messages` | Mensajes en conversaciones | conversationId → conversations |
| `topics` | Agrupación de documentos por org | unique(orgId, name) |
| `documents` | Documentos ingestados | topicId → topics (set null) |
| `document_chunks` | Chunks con embedding + tsvector | documentId → documents |
| `whatsapp_sessions` | Sesiones WhatsApp per-user | userId → users (unique) |
| `catalogs` | Catálogos de productos (quote plugin) | orgId |
| `catalog_items` | Items del catálogo con precios | catalogId → catalogs |

## Migrations
- **Nunca** modificar migraciones existentes. Crear una nueva para cada cambio.
- Nombre descriptivo: `0005_add_catalog_tables.sql`, etc.
- Ejecutar con `npm run migrate` (usa `drizzle-kit migrate`).
- En agent-grass: las migraciones se ejecutan **automáticamente en startup** (`src/infrastructure/db/client.ts`).

## Vector column
- Dimensión configurada en el schema (actualmente 768 para Gemini embeddings).
- Cambiar la dimensión requiere DROP y recrear el índice.
- Índices: IVFFlat para similarity search, GIN para full-text search (tsvector).
- Para producción con >100k chunks: considerar `pgvector.hnsw` sobre `ivfflat`.

## Relaciones
- Usar `ON DELETE CASCADE` en FKs de children (messages → conversations, chunks → documents).
- `ON DELETE SET NULL` para topicId en documents (borrar topic no borra docs).
- `orgId` es un string libre (no FK) para multi-tenancy simple.

## Queries
- Usar `db.query.*` para queries con relaciones (Drizzle relational API).
- Usar `db.select()` para queries simples sin joins.
- SQL raw solo en el retriever (operador `<=>` de pgvector) — permitido.

## Types
- Tipos Drizzle inferidos (`$inferSelect`, `$inferInsert`) en `src/infrastructure/db/schema.ts`.
- Interfaces de dominio en `src/domain/entities/index.ts`.
- **Domain y Application** importan de `src/domain/entities/` — nunca de `infrastructure/db/schema.ts`.
- **Infrastructure** puede importar de `infrastructure/db/schema.ts` directamente.
- Los tipos son estructuralmente compatibles — no hace falta mapping explícito.
