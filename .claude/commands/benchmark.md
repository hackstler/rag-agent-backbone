# /benchmark

Evalúa la calidad del retrieval con métricas objetivas sobre un conjunto de preguntas.

## Uso
```
/benchmark
```

## Qué hace Claude

1. **Pedir al usuario un conjunto de evaluación** (si no existe `benchmark.json`):
   - 10 preguntas con respuesta esperada conocida
   - Cada pregunta: `{ query, expectedAnswer, expectedSourceDocuments }`

2. **Ejecutar todas las preguntas**:
   ```bash
   for query in queries:
     curl -X POST http://localhost:3000/chat -d '{"query": query}'
   ```

3. **Calcular métricas**:
   - **Recall@K**: ¿Cuántas respuestas correctas están entre los top-K chunks?
   - **Precision@K**: De los K chunks recuperados, ¿cuántos son relevantes?
   - **Answer Faithfulness**: ¿La respuesta está fundamentada en los chunks? (verificación manual)
   - **Latency P50/P95**: distribución de latencias

4. **Generar reporte**:
   ```
   === Benchmark Results ===
   Total queries: 10

   Retrieval Metrics:
   - Recall@5:    0.80 (8/10 respuestas encontradas en top-5)
   - Precision@5: 0.60 (3/5 chunks relevantes en promedio)

   Latency:
   - P50: 820ms
   - P95: 2,100ms

   Recommendations:
   - Recall bajo: activar multi-query o aumentar top_k
   - Latencia alta: revisar reranking, considerar caché
   ```

5. **Guardar resultados** en `benchmark-results.json` para comparar entre versiones.

## Formato de benchmark.json
```json
[
  {
    "query": "¿Cuál es el límite de usuarios del plan Starter?",
    "expectedAnswer": "5 usuarios",
    "expectedSourceDocuments": ["pricing.pdf"]
  }
]
```
