# RAG Reference — Patrones y Decisiones de Diseño

Cheatsheet de referencia para desarrollar con este stack.

---

## Pipeline completo

```
Query usuario
    ↓
[Query Transformer] → multi-query / HyDE / step-back
    ↓
[Embedder] → OpenAI text-embedding-3-small (prod) / nomic-embed-text (local)
    ↓
[Retriever] → pgvector cosine similarity (<=> operator)
    ↓
[Reranker] → Cohere cross-encoder / local keyword (opcional)
    ↓
[Context Builder] → Formatear chunks como contexto
    ↓
[LLM] → Claude 3.5 Sonnet (prod) / Ollama mistral (local)
    ↓
Respuesta (JSON o SSE stream)
```

---

## Chunking — cuándo usar cada estrategia

| Estrategia | Mejor para | Evitar cuando |
|-----------|------------|---------------|
| **Fixed** | Documentos uniformes, soporte, FAQ | Docs con muchas tablas o código |
| **Semantic** | Artículos, wikis, prosa larga | Docs muy cortos (<500 tokens) |
| **Hierarchical** | Docs técnicos con secciones, código | Docs sin estructura clara |

**Regla de oro**: empieza con Fixed 512, ajusta con `/tune-retrieval` si la calidad no es suficiente.

### Overlap recomendado
- Fixed: 10-15% del chunk size (512 tokens → 50-75 de overlap)
- No más de 25%: el overlap excesivo genera chunks casi idénticos

---

## Retrieval — parámetros clave

```typescript
topK: 5,              // chunks a recuperar
                       // +topK = +recall, +latencia, +coste LLM
                       // Con reranking: recuperar 3x y reranquear a topK

similarityThreshold: 0.7,  // mínimo score para incluir un chunk
                            // Bajo → más chunks (más ruido)
                            // Alto → menos chunks (puede perderse info)
```

### Cuando bajar el threshold
- Preguntas parafraseadas no encuentran resultado
- Documentos en idiomas mixtos
- Dominio muy específico (jerga técnica)

### Cuando subir el threshold
- Demasiados chunks irrelevantes llegan al LLM
- Respuestas "alucinadas" con contenido que no está en los docs

---

## Query Enhancement — trade-offs

| Estrategia | Latencia extra | Mejora recall | Cuándo usar |
|-----------|---------------|--------------|-------------|
| None | 0ms | - | Default, queries directas |
| Multi-query | +300-500ms | +20-30% | Usuarios con vocabulario variado |
| HyDE | +400-600ms | +15-25% | Docs con terminología muy específica |
| Step-back | +300-500ms | +10-20% | Knowledge bases amplias |

---

## SSE Streaming — formato de eventos

```typescript
// 1. Fuentes recuperadas (siempre primero)
{ type: "sources", chunks: [{ id, title, score }] }

// 2. Tokens de texto (N veces)
{ type: "text", text: "token o fragmento" }

// 3. Fin del stream
{ type: "done" }

// En caso de error
{ type: "error", message: "descripción del error" }
```

### Consumir SSE en el cliente

```javascript
const es = new EventSource('/chat/stream?query=...');
es.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === 'text') appendToChat(data.text);
  if (data.type === 'done') es.close();
};
```

---

## pgvector — operadores de distancia

```sql
-- Cosine similarity (recomendado para embeddings normalizados)
embedding <=> query_vector

-- Euclidean distance
embedding <-> query_vector

-- Inner product (si embeddings no están normalizados)
embedding <#> query_vector
```

### Índice IVFFlat vs HNSW

| | IVFFlat | HNSW |
|-|---------|------|
| Velocidad de build | Rápido | Lento |
| Velocidad de query | Más rápido | Muy rápido |
| Uso de memoria | Bajo | Alto |
| Recall | 95-98% | 99%+ |
| Recomendado para | <1M rows | >1M rows |

```sql
-- IVFFlat (por defecto en este repo)
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Ajustar lists: ~sqrt(row_count)

-- HNSW (para escala mayor)
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

---

## Conversation Memory — estrategias

### Single-turn
- Sin estado entre requests
- Cada pregunta es independiente
- Más simple, menor uso de tokens

### Fixed window
```typescript
// Últimos N mensajes (N = windowSize * 2, user+assistant)
const history = messages.slice(-windowSize * 2);
```
- Predecible en coste (siempre envía N mensajes)
- Pierde contexto antiguo abruptamente

### Summary (TODO: implementar)
```typescript
// Cuando el historial supera X tokens, comprimir con LLM
const summary = await llm.complete(`Summarize this conversation: ${history}`);
```
- Coste variable pero controlado
- Mantiene "esencia" de conversaciones largas

---

## Costes aproximados (2024)

| Componente | Coste | Frecuencia |
|-----------|-------|-----------|
| Embedding (OpenAI text-3-small) | $0.02/1M tokens | Por documento ingestado + por query |
| LLM (Claude 3.5 Sonnet) | $3/1M input, $15/1M output | Por chat request |
| Reranking (Cohere) | $1/1M tokens | Por request con reranking |
| pgvector (Supabase) | $0 en free tier | Hosting |

**Estimación para 1000 queries/día**:
- Embeddings de queries: ~$0.05/día
- LLM responses: ~$15/día (asumiendo 1000 tokens promedio)
- Reranking: ~$0.50/día (si activo)

---

## Deploy — checklist de producción

### Antes de ir a prod
- [ ] `npm run typecheck` — sin errores TypeScript
- [ ] `npm run migrate` — migraciones aplicadas
- [ ] Variables de entorno configuradas en Railway
- [ ] pgvector habilitado en Supabase
- [ ] Índice IVFFlat creado **después** de cargar datos iniciales
- [ ] `GET /health` devuelve `{ status: "ok" }`
- [ ] Test de ingestión con documento real
- [ ] Test de chat con pregunta sobre el documento ingestado

### Railway + Supabase
1. Supabase: Nuevo proyecto → Settings → Database → Habilitar pgvector
2. Supabase: Copiar `DATABASE_URL` (Transaction pooler, port 6543)
3. Railway: Nuevo proyecto → Deploy from GitHub
4. Railway: Variables → añadir `DATABASE_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
5. Railway: Deploy → verificar logs

---

## Debugging frecuente

### "embedding <=> query_vector" query es lenta
```sql
SET ivfflat.probes = 10; -- default es 1, más alto = más lento pero mejor recall
```

### Chunks cortados en mitad de oración
- Aumentar `chunkOverlap`
- Cambiar a estrategia "semantic"

### Respuestas en idioma incorrecto
- Añadir al system prompt: "Respond in [language]. The context may be in a different language."

### Documento ingestado pero no se recupera
1. Verificar `status = 'indexed'` en tabla `documents`
2. Verificar que `embedding IS NOT NULL` en `document_chunks`
3. Comprobar dimensión del embedding vs `vector(1536)` en schema

### Ollama no responde
```bash
docker-compose logs ollama
docker-compose exec ollama ollama list  # ver modelos instalados
docker-compose exec ollama ollama pull mistral
```
