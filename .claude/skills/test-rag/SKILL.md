# Skill: /test-rag

## Propósito
Ejecutar una query de retrieval y mostrar los chunks recuperados con sus scores de relevancia.
Útil para diagnosticar por qué el RAG devuelve (o no) cierta información.

## Invocación
```
/test-rag [query]
```

## Ejemplos
```
/test-rag "¿cuáles son los precios del plan enterprise?"
/test-rag "how to configure authentication"
/test-rag "error al conectar con la base de datos"
```

## Pasos que ejecuta

1. **Verificar que hay documentos indexados**
   ```bash
   curl -s http://localhost:3000/health | jq .
   ```

2. **Ejecutar la query**
   ```bash
   curl -X POST http://localhost:3000/chat \
     -H "Content-Type: application/json" \
     -d '{"query": "[QUERY]"}' | jq .
   ```

3. **Mostrar resultados con análisis**
   Para cada chunk en `sources`:
   - Score de relevancia (0-1)
   - Documento origen
   - Extracto del contenido

4. **Diagnóstico**
   - Si score < 0.7: "El chunk está bajo el threshold, no se incluiría en contexto"
   - Si 0 chunks: "No hay documentos que coincidan. ¿Has ingestado documentos relevantes?"
   - Si score > 0.9: "Coincidencia fuerte ✓"

## Output esperado

```
Query: "¿cuáles son los precios?"
Chunks recuperados: 3

[1] Score: 0.89 | plan-pricing.pdf
    "El plan Starter tiene un coste de $29/mes..."

[2] Score: 0.82 | pricing-faq.md
    "Todos los precios incluyen IVA. El plan Enterprise..."

[3] Score: 0.74 | README.md
    "Consulta nuestra página de precios para más información..."

Respuesta generada:
[respuesta del LLM]
```

## Para investigar problemas de retrieval
Si los chunks recuperados no son relevantes:
1. Revisar la estrategia de chunking (¿chunk demasiado grande/pequeño?)
2. Probar con `/tune-retrieval` para análisis más profundo
3. Verificar que el documento fue indexado con `GET /ingest/status/:id`
