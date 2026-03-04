# /status

Muestra el estado actual del agente: configuración activa, tools registradas y estado del servidor.

## Uso
```
/status
```

---

## Instrucciones para Claude

### Paso 1 — Leer archivos (en paralelo)
- `setup-responses.md` (si existe)
- `src/plugins/rag/config/rag.config.ts`
- `src/plugins/rag/config/tools.config.ts`

### Paso 2 — Verificar servidor
```bash
curl -s http://localhost:3000/health 2>/dev/null
```

### Paso 3 — Mostrar resumen

```
═══ RAG Agent Status ═══════════════════════════════════════

Proyecto:     [agentName]  ([useCase])
Descripción:  [agentDescription]
Idioma:       [responseLanguage]
Configurado:  [fecha de setup-responses.md  |  ⚠ sin configurar — ejecuta /setup]

RAG Config:
  Chunking:   [chunkingStrategy] · [chunkSize] tokens · [chunkOverlap] overlap
  Query:      [queryEnhancement][  · [multiQueryCount] variaciones  (si multi-query)]
  Reranking:  [enableReranking ? "top-[rerankTopK] via [rerankerProvider]" : "off"]
  Memoria:    [memoryStrategy] · [windowSize] turnos
  topK:       [topK]  ·  threshold: [similarityThreshold]

Tools:
  ✓ searchDocuments   — siempre activa (pgvector)
  [✓|✗] searchWeb     — [activa via Perplexity  |  inactiva: sin PERPLEXITY_API_KEY]
  [para cada key adicional en tools.config.ts: ✓/✗ nombre — descripción]

Servidor:     [✓ online :3000  ·  [documentCount] docs indexados
              |  ✗ offline — ejecuta npm run dev  o  docker-compose up]

═══════════════════════════════════════════════════════════
```

### Notas de formato
- Si `setup-responses.md` no existe, añade al final:
  > "⚠  Sin configurar. Ejecuta `/setup` para empezar."
- Si el servidor está offline, no muestres el recuento de documentos.
- Si una tool tiene `enabled: false`, muéstrala con `✗` y la razón (ej: "sin PERPLEXITY_API_KEY").
- Muestra solo las secciones con datos reales — no pongas placeholders vacíos.
