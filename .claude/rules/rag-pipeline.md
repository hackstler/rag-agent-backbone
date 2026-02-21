# RAG Pipeline Rules

## Stack obligatorio
- **Mastra.ai** para orquestación LLM. No usar LangChain JS ni Vercel AI SDK directamente (usarlos solo como referencia en `references/`).
- **pgvector** para búsqueda vectorial. No usar Pinecone, Weaviate ni otros en el stack principal.
- **Drizzle ORM** para todas las queries. No usar Prisma ni queries SQL raw excepto en el retriever (donde se necesita la sintaxis `<=>` de pgvector).

## Pipeline de RAG — orden estricto
1. Query transformation (si está habilitada en `ragConfig`)
2. Embedding de la query transformada
3. Retrieval con `retrieve()` o `retrieveMultiQuery()`
4. Reranking (si `ragConfig.enableReranking === true`)
5. Context building con `buildContext()`
6. LLM generation (streaming o completo)
7. Persistencia en DB (después de completar la respuesta)

## Embeddings
- OpenAI `text-embedding-3-small` en producción (1536 dims)
- Ollama `nomic-embed-text` en local (768 dims)
- **Importante**: la dimensión del vector debe coincidir con la columna `vector(1536)` en el schema. Si cambias el modelo, actualiza el schema y crea una migración.

## Chunking
- No pre-chunkar en el loader. El loader devuelve texto completo, el chunker lo divide.
- Respetar la estrategia definida en `ragConfig.chunkingStrategy`.
- Overlap mínimo 10% del chunk size para mantener continuidad de contexto.

## Retrieval
- Siempre filtrar chunks de documentos con `status = 'indexed'`. No recuperar de docs en estado `pending` o `failed`.
- El threshold de similitud por defecto es 0.7. Documentos por debajo no se incluyen en contexto.
- Con multi-query: deduplicar por `chunk.id`, mantener el score más alto.

## Persistencia
- Guardar mensajes de usuario Y asistente después de completar la respuesta (no durante streaming).
- No guardar chunks completos en `messages.metadata`. Solo `chunk.id[]`.
- Actualizar `conversations.updated_at` en cada interacción.

## Errores
- Si el retrieval no encuentra chunks: responder "No encuentro información sobre eso en los documentos disponibles" (o equivalente en el idioma configurado). No inventar.
- Si el LLM falla: propagar el error con mensaje descriptivo. No reintentar automáticamente.
- Si el embedding falla: marcar el documento como `failed` en DB.
