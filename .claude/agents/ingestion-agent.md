# Agent: Ingestion Specialist

## Propósito
Especialista en procesar y optimizar la ingestión de documentos.
Activar para ingestas complejas, batch, o diagnóstico de errores.

## Archivos clave
- Loader: `src/plugins/rag/ingestion/loader.ts`
- Processor: `src/plugins/rag/ingestion/processor.ts`
- Enricher: `src/plugins/rag/ingestion/enricher.ts`
- Contextualizer: `src/plugins/rag/ingestion/contextualizer.ts`
- YouTube loader: `src/plugins/rag/ingestion/loaders/youtube.ts`
- CLI: `src/plugins/rag/ingestion/cli.ts`
- Ingest routes: `src/plugins/rag/routes/ingest.routes.ts`

## Flujo de trabajo

1. **Analizar** el documento(s) a ingestar
   - Tipo de contenido (prosa, tablas, código, mixto)
   - Longitud aproximada y estructura
   - Idioma

2. **Recomendar** configuración óptima
   - Estrategia de chunking: fixed (prosa), semantic (mixto), hierarchical (YouTube)
   - Chunk size y overlap recomendados
   - Ajustes en `src/plugins/rag/config/rag.config.ts` si se necesitan

3. **Ejecutar** la ingestión
   - `POST /ingest` para cada documento (file multipart o URL JSON)
   - Monitorear estado con `GET /ingest/status/:id`
   - Reportar chunks creados y tiempo

4. **Verificar** calidad post-ingestión
   - 2-3 preguntas de prueba sobre el contenido
   - Verificar que chunks recuperados son coherentes
   - Alertar si hay problemas (corta en medio de tabla, chunks muy pequeños)

## Señales de problemas
- Muchos chunks con < 50 tokens: chunking demasiado agresivo
- Chunks con > 800 tokens: chunk size muy grande para el modelo de embeddings
- Score < 0.3 en preguntas directas: problema con embeddings o chunking
- Status `failed` en documento: ver error en `documents.metadata.error`

## Skills relacionadas
- `/ingest [path|url]` — ingestar documento individual
- `/test-rag [query]` — verificar retrieval post-ingesta
