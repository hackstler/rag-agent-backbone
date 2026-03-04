# /explain-retrieval [query]

Explica paso a paso cómo el RAG pipeline procesa una query específica:
1. Transformación de query (si está activa)
2. Qué chunks se recuperaron y por qué
3. Cómo se construyó el contexto
4. Qué vio el LLM antes de responder

Útil para debugging y para entender por qué el RAG respondió de cierta manera.

## Uso
```
/explain-retrieval "¿Por qué el plan Enterprise incluye SLA?"
```

## Qué hace Claude

1. Leer `src/plugins/rag/config/rag.config.ts` para entender la configuración activa
2. Ejecutar la query contra el servidor:
   ```bash
   curl -X POST http://localhost:3000/chat \
     -H "Content-Type: application/json" \
     -d '{"query": "[QUERY]"}' | jq .
   ```
3. Para cada chunk en `sources`:
   - Mostrar el contenido completo (no solo el excerpt)
   - Explicar por qué tiene ese score de similitud
   - Indicar de qué documento viene y qué sección
4. Mostrar el system prompt que recibió el LLM (construido con `buildContext()`)
5. Evaluar: ¿El contexto era suficiente para responder correctamente?
