# Evals y Scorers en CI

## Qué aporta
Mastra soporta evaluación de salidas con scorers para calidad y regresión.

## Valor para este repo
Hoy tienes tests de integración API, pero no tests de calidad de respuesta RAG.

## Set mínimo recomendado
- `faithfulness` (respuesta sustentada por fuentes)
- `relevance` (responde la pregunta)
- `groundedness/citation` (citas coherentes)
- `safety` (no inventar cuando no hay contexto)

## Pipeline CI sugerido
1. Dataset pequeño de preguntas conocidas.
2. Ejecutar agente sobre dataset.
3. Correr scorers con umbrales.
4. Fallar CI si cae por debajo del baseline.

## Referencias
- https://mastra.ai/docs
- https://github.com/mastra-ai/mastra

