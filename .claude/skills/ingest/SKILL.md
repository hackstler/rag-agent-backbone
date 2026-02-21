# Skill: /ingest

## Propósito
Ingestar un documento (archivo local o URL) en el vector store del RAG agent.
Chunka, embebe y almacena el documento, luego confirma que el retrieval funciona.

## Invocación
```
/ingest [ruta-archivo-o-url]
```

## Ejemplos
```
/ingest ./docs/manual.pdf
/ingest ./README.md
/ingest https://example.com/docs/api-reference
```

## Pasos que ejecuta

1. **Verificar que el servidor está corriendo**
   ```bash
   curl -s http://localhost:3000/health | jq .
   ```

2. **Ingestar el documento**
   - Si es archivo:
     ```bash
     curl -X POST http://localhost:3000/ingest \
       -F "file=@[RUTA]" \
       -F "orgId=default"
     ```
   - Si es URL:
     ```bash
     curl -X POST http://localhost:3000/ingest \
       -H "Content-Type: application/json" \
       -d '{"url": "[URL]", "orgId": "default"}'
     ```

3. **Verificar estado**
   ```bash
   curl http://localhost:3000/ingest/status/[DOCUMENT_ID] | jq .
   ```

4. **Test rápido de retrieval**
   Hacer una pregunta sobre el documento recién ingestado:
   ```bash
   curl -X POST http://localhost:3000/chat \
     -H "Content-Type: application/json" \
     -d '{"query": "¿De qué trata este documento?", "conversationId": null}'
   ```

5. **Reportar resultado**
   - ID del documento
   - Número de chunks creados
   - Tiempo de indexación
   - Preview de la respuesta al test de retrieval

## Errores comunes
- **"Document produced no chunks"**: archivo vacío o formato no soportado
- **"Ollama embedding failed"**: Ollama no está corriendo (`docker-compose up ollama`)
- **"OPENAI_API_KEY required"**: falta la API key en `.env`
