# Workflows vNext (patrones prácticos)

## Qué aporta
Mastra workflows permite componer pasos explícitos (`then`, `branch`, `parallel`) para pipelines deterministas.

## Encaje con tu repo
Ya tienes `src/agent/workflow.ts`, pero no está conectado al runtime de `/chat`. Este documento define cuándo usarlo.

## Recomendación concreta
- Mantener `Agent` para conversación libre/tool-calling.
- Conectar `Workflow` para tareas deterministas:
  - ingestas controladas,
  - retrieval expandido con reglas claras,
  - generación de artefactos.

## Patrones útiles
- `branch` por `chunkCount` (ya implementado): expand query solo cuando falta contexto.
- `parallel` para recuperar de dos fuentes (KB + web) y fusionar.
- `suspend/resume` para human-in-the-loop en tareas de alto riesgo.

## Señal para elegir workflow
Usa workflow cuando necesites:
- reproducibilidad,
- auditoría por paso,
- retry controlado,
- menor variabilidad del LLM.

## Referencias
- https://mastra.ai/workflows
- https://mastra.ai/blog/announcing-mastra-1
- https://github.com/mastra-ai/mastra

