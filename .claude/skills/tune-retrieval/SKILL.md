# Skill: /tune-retrieval

## Propósito
Analizar la calidad del retrieval con un conjunto de preguntas de prueba.
Identifica problemas con chunking, thresholds, o estrategias de query.

## Invocación
```
/tune-retrieval
```

## Pasos que ejecuta

1. **Inventario de documentos**
   ```bash
   # Ver qué documentos están indexados
   curl -s "http://localhost:3000/health" | jq .
   ```
   Leer de DB: `SELECT id, title, chunk_count, status FROM documents`

2. **Generar preguntas de prueba**
   Basándose en los documentos indexados, crear 5 preguntas variadas:
   - 2 preguntas directas (respuesta obvia en el texto)
   - 2 preguntas parafraseadas (misma info, palabras distintas)
   - 1 pregunta fuera del dominio (debería devolver 0 chunks)

3. **Ejecutar cada pregunta y analizar**
   Para cada pregunta:
   - Número de chunks recuperados
   - Score promedio y score mínimo
   - ¿La respuesta generada es correcta?

4. **Generar recomendaciones**

   | Síntoma | Diagnóstico | Acción |
   |---------|-------------|--------|
   | 0 chunks para preguntas relevantes | Threshold muy alto | Bajar `RAG_SIMILARITY_THRESHOLD` a 0.6 |
   | Chunks irrelevantes con score alto | Chunk size muy grande | Reducir `RAG_CHUNK_SIZE` a 256 |
   | Buena similitud pero mala respuesta | Contexto insuficiente | Aumentar `RAG_TOP_K` a 8 |
   | Preguntas parafraseadas fallan | Sin query enhancement | Activar `multi-query` en config |
   | Latencia >3s por request | Sin caché, reranking lento | Revisar reranker config |

5. **Proponer cambios en `src/config/rag.config.ts`**
   Mostrar el diff concreto a aplicar.

## Output esperado

```
=== RAG Retrieval Audit ===

Documentos indexados: 3
Total chunks: 847

Pregunta 1 (directa): "¿Cuál es el precio del plan Starter?"
  → 4 chunks recuperados | Score avg: 0.84 | ✓ Respuesta correcta

Pregunta 2 (parafraseada): "¿Cuánto cuesta el nivel básico?"
  → 1 chunk recuperado | Score avg: 0.71 | ⚠ Respuesta parcial

Pregunta 3 (fuera de dominio): "¿Cuál es la capital de Francia?"
  → 0 chunks recuperados | ✓ Correcto (no hay info)

=== Recomendaciones ===
1. Activar multi-query (pregunta 2 se beneficiaría)
   Cambio: queryEnhancement: "multi-query"

2. Considerar aumentar top_k de 5 a 7
   Cambio: topK: 7
```
