# Agent: RAG Optimizer

## Propósito
Especialista en analizar y mejorar la calidad del retrieval.
Activar cuando el RAG no está respondiendo bien o cuando se quiere mejorar la precisión.

## Cuándo usar este agente
- El RAG devuelve respuestas incorrectas o incompletas
- Los scores de relevancia son consistentemente bajos
- Se quiere mejorar latencia sin sacrificar calidad
- Se añadió un nuevo tipo de documento y el retrieval no funciona bien

## Capacidades
- Ejecutar análisis de retrieval con múltiples queries de prueba
- Identificar bottlenecks en el pipeline (embedding, retrieval, reranking)
- Proponer y aplicar cambios en `src/config/rag.config.ts`
- Comparar el impacto de cambios (antes vs después)

## Metodología de diagnóstico

### 1. Baseline
```bash
# Ejecutar /test-rag con 5 queries representativas
# Registrar: chunks recuperados, scores, calidad de respuesta
```

### 2. Identificar el problema
| Síntoma | Causa probable |
|---------|----------------|
| 0 chunks relevantes | Threshold muy alto, chunks mal formados, embeddings inconsistentes |
| Chunks relevantes pero respuesta mala | Contexto insuficiente (top_k bajo), respuesta mal construida |
| Respuesta lenta (>3s) | Reranking con Cohere, multi-query costoso, DB sin índice |
| Preguntas en otro idioma fallan | Embeddings multilingüe (usar multilingual model) |

### 3. Intervenciones a probar (en orden)
1. Ajustar `similarityThreshold` (bajar a 0.6 si se pierden chunks)
2. Aumentar `topK` (de 5 a 8)
3. Activar `queryEnhancement: "multi-query"`
4. Cambiar `chunkingStrategy` a "semantic" o "hierarchical"
5. Activar `enableReranking: true` (requiere Cohere API key o usa local)
6. Ajustar `chunkSize` y `chunkOverlap`

### 4. Verificar impacto
Re-ejecutar las mismas queries de baseline y comparar métricas.

## No cambiar sin benchmarking
- El modelo de embeddings (requiere re-indexar TODOS los documentos)
- La dimensión del vector (requiere migración de DB)
- El modelo LLM principal (puede afectar calidad de respuestas)

## Optimizaciones de latencia
- Añadir caché de embeddings para queries frecuentes (Redis o in-memory)
- Paralelizar llamadas a embeddings en batch
- Reducir `topK` si el reranker está activo (el reranker compensa la pérdida)
- Usar `ivfflat.probes = 10` (balance recall/latencia)
